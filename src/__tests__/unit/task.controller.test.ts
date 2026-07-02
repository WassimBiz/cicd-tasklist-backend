import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

vi.mock("../../services/task.service.js", () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

import * as taskService from "../../services/task.service.js";
import {
  createTask,
  deleteTask,
  getAllTasks,
  getTaskById,
  updateTask,
} from "../../controllers/task.controller.js";

function createResponseMock() {
  const json = vi.fn();
  const send = vi.fn();
  const status = vi.fn();
  status.mockReturnValue({ json, send });

  return {
    response: { status, json, send } as unknown as Response,
    status,
    json,
    send,
  };
}

function request(overrides: Partial<Request>): Request {
  return {
    body: {},
    params: {},
    ...overrides,
  } as unknown as Request;
}

describe("TaskController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("renvoie la liste des tâches avec le statut 200", async () => {
    const tasks = [{ id: 1, title: "Pipeline", completed: false }];
    (taskService.findAll as any).mockResolvedValue(tasks);
    const response = createResponseMock();

    await getAllTasks(request({}), response.response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(tasks);
  });

  it("renvoie 500 lorsque la récupération de la liste échoue", async () => {
    (taskService.findAll as any).mockRejectedValue(new Error("database unavailable"));
    const response = createResponseMock();

    await getAllTasks(request({}), response.response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: "Failed to fetch tasks" });
  });

  it("renvoie 400 pour un identifiant de tâche invalide", async () => {
    const response = createResponseMock();

    await getTaskById(request({ params: { id: "abc" } }), response.response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
    expect(taskService.findById).not.toHaveBeenCalled();
  });

  it("renvoie 404 lorsque la tâche demandée n'existe pas", async () => {
    (taskService.findById as any).mockResolvedValue(undefined);
    const response = createResponseMock();

    await getTaskById(request({ params: { id: "42" } }), response.response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: "Task not found" });
  });

  it("renvoie la tâche demandée lorsque son identifiant est valide", async () => {
    const task = { id: 2, title: "Publier l'image", completed: false };
    (taskService.findById as any).mockResolvedValue(task);
    const response = createResponseMock();

    await getTaskById(request({ params: { id: "2" } }), response.response);

    expect(taskService.findById).toHaveBeenCalledWith(2);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(task);
  });

  it("rejette la création d'une tâche sans titre exploitable", async () => {
    const response = createResponseMock();

    await createTask(request({ body: { title: "   " } }), response.response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: "Title is required and must be a non-empty string",
    });
    expect(taskService.create).not.toHaveBeenCalled();
  });

  it("nettoie le titre avant de créer une tâche et renvoie 201", async () => {
    const task = { id: 3, title: "Tester Trivy", description: undefined, completed: false };
    (taskService.create as any).mockResolvedValue(task);
    const response = createResponseMock();

    await createTask(
      request({ body: { title: "  Tester Trivy  ", description: undefined } }),
      response.response,
    );

    expect(taskService.create).toHaveBeenCalledWith({
      title: "Tester Trivy",
      description: undefined,
    });
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(task);
  });

  it("renvoie 404 lorsque la mise à jour cible une tâche introuvable", async () => {
    (taskService.update as any).mockRejectedValue(new Error("Task not found"));
    const response = createResponseMock();

    await updateTask(
      request({ params: { id: "9" }, body: { completed: true } }),
      response.response,
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: "Task not found" });
  });

  it("renvoie 200 après une mise à jour réussie", async () => {
    const updated = { id: 9, title: "Terminé", completed: true };
    (taskService.update as any).mockResolvedValue(updated);
    const response = createResponseMock();

    await updateTask(
      request({ params: { id: "9" }, body: { completed: true } }),
      response.response,
    );

    expect(taskService.update).toHaveBeenCalledWith(9, { completed: true });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(updated);
  });

  it("renvoie 204 après une suppression réussie", async () => {
    (taskService.remove as any).mockResolvedValue({ id: 4 });
    const response = createResponseMock();

    await deleteTask(request({ params: { id: "4" } }), response.response);

    expect(taskService.remove).toHaveBeenCalledWith(4);
    expect(response.status).toHaveBeenCalledWith(204);
    expect(response.send).toHaveBeenCalledWith();
  });

  it("renvoie 404 lorsque la suppression cible une tâche inexistante", async () => {
    (taskService.remove as any).mockRejectedValue(new Error("Task not found"));
    const response = createResponseMock();

    await deleteTask(request({ params: { id: "4" } }), response.response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: "Task not found" });
  });
});
