import { Router, type IRouter } from "express";
import { GetRetrievedChunksQueryParams } from "@workspace/api-zod";
import { getLastEval, getEvalHistory } from "../lib/evalStore";

const router: IRouter = Router();

router.get("/eval/chunks", async (req, res): Promise<void> => {
  const params = GetRetrievedChunksQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const evalData = getLastEval(params.data.sessionId);

  if (!evalData) {
    res.json({
      query: null,
      retrievedChunks: [],
      faithfulnessScore: null,
      usedWebSearch: false,
    });
    return;
  }

  res.json(evalData);
});

router.get("/eval/history", async (_req, res): Promise<void> => {
  const history = getEvalHistory();
  res.json(history);
});

export default router;
