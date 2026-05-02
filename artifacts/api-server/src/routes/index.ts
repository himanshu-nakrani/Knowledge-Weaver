import { Router, type IRouter } from "express";
import healthRouter from "./health";
import documentsRouter from "./documents";
import chatRouter from "./chat";
import toolsRouter from "./tools";
import evalRouter from "./eval";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(documentsRouter);
router.use(chatRouter);
router.use(toolsRouter);
router.use(evalRouter);
router.use(statsRouter);

export default router;
