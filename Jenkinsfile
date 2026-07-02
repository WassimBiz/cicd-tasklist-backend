pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  environment {
    IMAGE_NAME = 'tasklist-backend'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Pré-vérifications') {
      steps {
        sh '''#!/usr/bin/env bash
          set -euo pipefail
          node --version
          npm --version
          docker --version
          trivy --version
          syft version
        '''
      }
    }

stage('Installation') {
  steps {
    sh '''
      npm ci
      npx prisma generate
    '''
  }
}

    stage('Tests et couverture') {
      steps {
        sh 'npm run test:coverage'
      }
    }

    stage('Build du backend') {
      steps {
        sh 'npm run build'
      }
    }

    stage('Analyse SonarQube') {
      steps {
        script {
          def scannerHome = tool 'SonarScanner'
          withSonarQubeEnv('SonarQube') {
            sh "${scannerHome}/bin/sonar-scanner"
          }
        }
      }
    }

    stage('Scan des dépendances et du dépôt') {
      steps {
        sh '''#!/usr/bin/env bash
          set -euo pipefail
          mkdir -p reports
          trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL --ignore-unfixed \
            --format table --output reports/trivy-filesystem.txt .
        '''
      }
    }

    stage('Build image Docker') {
      steps {
        sh 'docker build --pull -t ${IMAGE_NAME}:${BUILD_NUMBER} .'
      }
    }

    stage('Scan image et SBOM SPDX') {
      steps {
        sh '''#!/usr/bin/env bash
          set -euo pipefail
          mkdir -p reports
          trivy image --severity HIGH,CRITICAL --ignore-unfixed --format table \
            --output reports/trivy-image.txt "${IMAGE_NAME}:${BUILD_NUMBER}"
          syft "${IMAGE_NAME}:${BUILD_NUMBER}" -o spdx-json=sbom-spdx.json
        '''
      }
    }

    stage('Publication Docker Hub') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub-credentials',
          usernameVariable: 'DOCKERHUB_USERNAME',
          passwordVariable: 'DOCKERHUB_TOKEN'
        )]) {
          sh '''#!/usr/bin/env bash
            set -euo pipefail
            IMAGE_REPOSITORY="${DOCKERHUB_USERNAME}/tasklist-backend"
            echo "$DOCKERHUB_TOKEN" | docker login --username "$DOCKERHUB_USERNAME" --password-stdin
            docker tag "${IMAGE_NAME}:${BUILD_NUMBER}" "${IMAGE_REPOSITORY}:${BUILD_NUMBER}"
            docker tag "${IMAGE_NAME}:${BUILD_NUMBER}" "${IMAGE_REPOSITORY}:latest"
            docker push "${IMAGE_REPOSITORY}:${BUILD_NUMBER}"
            docker push "${IMAGE_REPOSITORY}:latest"
            docker logout
          '''
        }
      }
    }
  }

  post {
    always {
      junit allowEmptyResults: false, testResults: 'reports/junit.xml'
      archiveArtifacts artifacts: 'dist/**,coverage/**,reports/**,sbom-spdx.json', allowEmptyArchive: true, fingerprint: true
    }
    cleanup {
      deleteDir()
    }
  }
}
