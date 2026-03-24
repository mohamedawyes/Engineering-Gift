import { Router, type IRouter } from "express";
import healthRouter from "./health";
import calculationsRouter from "./calculations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(calculationsRouter);

export default router;
