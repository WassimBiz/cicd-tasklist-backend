import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "@prisma/client";

vi.mock("../../lib/prisma.js", () => ({
  default: {
    task: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import prisma from "../../lib/prisma.js";
import * as taskService from "../../services/task.service.js";

const mockPrisma = vi.mocked(prisma);

const mockTask: Task = {
  id: 1,
  title: "Préparer le pipeline",
  description: "Créer les fichiers Jenkins",
  completed: false,
  createdAt: new Date("2026-07-02T08:00:00.000Z"),
  updatedAt: new Date("2026-07-02T08:00:00.000Z"),
};

describe("TaskService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne les tâches triées de la plus récente à la plus ancienne", async () => {
    (mockPrisma.task.findMany as any).mockResolvedValue([mockTask]);

    await expect(taskService.findAll()).resolves.toEqual([mockTask]);
    expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
  });

  it("retourne une tâche à partir de son identifiant", async () => {
    (mockPrisma.task.findUnique as any).mockResolvedValue(mockTask);

    await expect(taskService.findById(1)).resolves.toEqual(mockTask);
    expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("crée une tâche avec les données reçues", async () => {
    const payload = { title: "Tester le backend", description: "Vitest + Prisma mocké" };
    (mockPrisma.task.create as any).mockResolvedValue(mockTask);

    await expect(taskService.create(payload)).resolves.toEqual(mockTask);
    expect(mockPrisma.task.create).toHaveBeenCalledWith({ data: payload });
  });

  it("met à jour une tâche existante", async () => {
    const updatedTask = { ...mockTask, completed: true };
    (mockPrisma.task.findUnique as any).mockResolvedValue(mockTask);
    (mockPrisma.task.update as any).mockResolvedValue(updatedTask);

    await expect(taskService.update(1, { completed: true })).resolves.toEqual(updatedTask);
    expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.task.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { completed: true },
    });
  });

  it("refuse la mise à jour d'une tâche introuvable", async () => {
    (mockPrisma.task.findUnique as any).mockResolvedValue(null);

    await expect(taskService.update(999, { title: "Inexistante" })).rejects.toThrow(
      "Task not found",
    );
    expect(mockPrisma.task.update).not.toHaveBeenCalled();
  });

  it("supprime une tâche existante", async () => {
    (mockPrisma.task.findUnique as any).mockResolvedValue(mockTask);
    (mockPrisma.task.delete as any).mockResolvedValue(mockTask);

    await expect(taskService.remove(1)).resolves.toEqual(mockTask);
    expect(mockPrisma.task.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("refuse la suppression d'une tâche introuvable", async () => {
    (mockPrisma.task.findUnique as any).mockResolvedValue(null);

    await expect(taskService.remove(999)).rejects.toThrow("Task not found");
    expect(mockPrisma.task.delete).not.toHaveBeenCalled();
  });
});
