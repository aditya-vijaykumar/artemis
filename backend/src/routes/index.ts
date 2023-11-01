import express from "express";
import { requestFailed } from "../utils/serverResponses";
import { createDao, fetchAllDao } from "../controller/daoControllers";
import {
  checkStatusOfClaim,
  createNewCredentialRequest,
  fetchCredentialsOfAddress,
} from "../controller/credentialControllers";
import { validateAdmin } from "../middleware/validateAdmin";
import { checkForCors } from "../middleware/corsPolicy";

const router = express.Router();

router.get("/dao", checkForCors, fetchAllDao);

router.get("/credential/:address", checkForCors, fetchCredentialsOfAddress);

router.post("/credential/new", checkForCors, createNewCredentialRequest);

router.post("/credential/status", checkStatusOfClaim);

router.post("/dao/add", validateAdmin, createDao);

router.use((_req, res, _next) => {
  return requestFailed(res, 404, "Route Not Found!");
});

export default router;
