import { Router, type IRouter } from "express";
import { db, calculationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SaveCalculationBody, DeleteCalculationParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/calculations", async (req, res) => {
  try {
    const calculations = await db
      .select()
      .from(calculationsTable)
      .orderBy(calculationsTable.createdAt);
    res.json(calculations);
  } catch (err) {
    req.log.error({ err }, "Failed to get calculations");
    res.status(500).json({ error: "Failed to get calculations" });
  }
});

router.post("/calculations", async (req, res) => {
  try {
    const body = SaveCalculationBody.parse(req.body);
    const [calculation] = await db
      .insert(calculationsTable)
      .values({
        type: body.type,
        projectName: body.projectName ?? null,
        engineerName: body.engineerName ?? null,
        inputs: body.inputs,
        results: body.results,
      })
      .returning();
    res.status(201).json(calculation);
  } catch (err) {
    req.log.error({ err }, "Failed to save calculation");
    res.status(500).json({ error: "Failed to save calculation" });
  }
});

router.delete("/calculations/:id", async (req, res) => {
  try {
    const { id } = DeleteCalculationParams.parse({ id: req.params.id });
    await db.delete(calculationsTable).where(eq(calculationsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete calculation");
    res.status(500).json({ error: "Failed to delete calculation" });
  }
});

export default router;
