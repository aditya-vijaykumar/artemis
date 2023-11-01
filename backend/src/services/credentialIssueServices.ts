import { v4 as uuidv4 } from "uuid";
import nodeCron from "node-cron";
import { Request, Response } from "express";
import { getAddress } from "../db/getAddress";
import { createNewAddress } from "../db/createNewAddress";
import {
  internalServerError,
  requestFailed,
  responseSuccess,
} from "../utils/serverResponses";
import { getDao } from "../db/getDao";
import httpStatusCodes from "../config/httpStatusCodes";
import { CredentialsRequestSingleton } from "../utils/CredentialsRequestSingleton";
import { getLatestValidCredentialOfAddress } from "../db/getLatestValidCredentialOfAddress";
import axios, { AxiosError } from "axios";
import { responseFn } from "../utils/dynamicReturnFunction";
import {
  issuerNodeApiToGetAllCredentials,
  completeClaimRevocation,
  issuerNodeApiToCheckClaimLinkStatus,
  issuerNodeApiToCreateClaimLink,
  issuerNodeApiToCreateClaimQRCode,
  issuerNodeApiToFetchRevocationNonce,
  issuerNodeApiToRevokeClaim,
  getQrDataApi,
} from "../utils/issuerNodeApiCalls";
import {
  BigNumberish,
  BrowserProvider,
  JsonRpcApiProvider,
  JsonRpcProvider,
  ethers,
} from "ethers";
import { voteBalanceAbi } from "../config/voteBalanceAbi";
import { revokeCredential } from "../db/revokeCredential";
import { createNewCredential } from "../db/createNewCredential";

export const serviceCreateNewCredentialQr = async (
  req: Request,
  res: Response
) => {
  const functionName = "serviceCreateNewCredentialQr";
  try {
    const { address, daoKey } = req.body;

    const addressDetails = await getAddress(address);
    if (!addressDetails.status || addressDetails.data == null) {
      const createAddressRecord = await createNewAddress(address);
      if (!createAddressRecord.status) {
        return internalServerError(res, "Something went wrong");
      }
    }

    const daoDetails = await getDao(daoKey);
    if (!daoDetails.status || daoDetails.data == null) {
      return requestFailed(res, httpStatusCodes.BAD_REQUEST, "Invalid DAO Key");
    }

    // updating the mapping
    if (
      CredentialsRequestSingleton.getInstance().checkIfClaimExistsForAddress({
        daoKey,
        address,
      })
    ) {
      // NOTES - can potentially prohibit frequent requests
      const sessionId =
        CredentialsRequestSingleton.getInstance().fetchSessionForAddress({
          daoKey,
          address,
        });
      if (sessionId != null) {
        CredentialsRequestSingleton.getInstance().unsetSessionIdObject(
          sessionId
        );
      }
    }

    // NOTES - Can uncomment to limit number of requests to once every 24 hours
    // const existingCredentialCheck = await getLatestValidCredentialOfAddress({
    //   address,
    //   daoKey,
    // });
    // if (!existingCredentialCheck.status) {
    //   return requestFailed(
    //     res,
    //     httpStatusCodes.BAD_REQUEST,
    //     "Credential existence could not be verified."
    //   );
    // }
    // if (
    //   existingCredentialCheck.data != undefined &&
    //   new Date(existingCredentialCheck.data.issuedDate).getTime() >
    //     new Date().getTime() - 24 * 60 * 60 * 1000
    // ) {
    //   return requestFailed(
    //     res,
    //     httpStatusCodes.BAD_REQUEST,
    //     "Credential was recently claimed by address, please wait for one day before trying again."
    //   );
    // }

    const provider = new JsonRpcProvider(
      process.env.DEFAULT_RPC || "https://rpc-mumbai.maticvigil.com"
    );
    const voteBalanceContract = new ethers.Contract(
      daoDetails.data.contractAddress,
      voteBalanceAbi,
      provider
    );
    const voteBalanceBigN: BigNumberish =
      await voteBalanceContract.getVotingBalance(address);

    const voteBalance = parseInt(voteBalanceBigN.toString());
    console.log({ voteBalance });

    const now = new Date();
    const expirationAsDate = new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000); // Adding 42 days in milliseconds
    const credentialExpiration = expirationAsDate.toISOString().slice(0, 10);
    const expiration = new Date(
      now.getTime() + 3 * 60 * 60 * 1000
    ).toISOString(); // Adding 3 hours in milliseconds

    const amId = uuidv4();

    const credentialSubject = {
      amId,
      daoKey,
      voteBalance,
      timestamp: Math.ceil(now.getTime() / 1000),
    };

    const fetchClaimLink = await issuerNodeApiToCreateClaimLink({
      schemaID: process.env.POLYGON_ID_SCHEMA_ID || "8bfd1ff3-938b-4eda-821a-86217aa5a642" ,
      credentialExpiration,
      expiration,
      credentialSubject,
    });
    if (!fetchClaimLink.status || fetchClaimLink.data == null) {
      return requestFailed(
        res,
        httpStatusCodes.INTERNAL_SERVER_ERROR,
        fetchClaimLink.message ?? "Could not generate a claim."
      );
    }

    const fetchClaimQrData = await issuerNodeApiToCreateClaimQRCode(
      fetchClaimLink.data.id
    );
    if (!fetchClaimQrData.status || fetchClaimQrData.data == null) {
      return requestFailed(
        res,
        httpStatusCodes.INTERNAL_SERVER_ERROR,
        fetchClaimQrData.message ?? "Could not generate a claim QR code."
      );
    }
    let claimObj = {
      amId,
      address,
      sessionId: fetchClaimQrData.data.data.sessionID,
      claimLinkId: fetchClaimLink.data.id,
      daoKey,
    };
    CredentialsRequestSingleton.getInstance().setNewRequest(claimObj);

    return responseSuccess(
      res,
      httpStatusCodes.OK,
      fetchClaimQrData.data.qrCode,
      "Successfully generated new qr code to claim a credential."
    );
  } catch (error) {}
};

export const serviceCredentialStatusCheckForAddress = async (
  req: Request,
  res: Response
) => {
  const functionName = "serviceCredentialStatusCheckForAddress";
  try {
    const { address, daoKey } = req.body;

    const addressDetails = await getAddress(address);
    if (!addressDetails.status || addressDetails.data == null) {
      return requestFailed(
        res,
        httpStatusCodes.NOT_FOUND,
        "Address is yet to be registered."
      );
    }
    const daoDetails = await getDao(daoKey);
    if (!daoDetails.status || daoDetails.data == null) {
      return requestFailed(res, httpStatusCodes.BAD_REQUEST, "Invalid DAO Key");
    }

    const claimRequestStore = CredentialsRequestSingleton.getInstance();
    if (claimRequestStore.getAllSessions().size == 0) {
      return requestFailed(
        res,
        httpStatusCodes.NOT_FOUND,
        "No active Credential Request found."
      );
    }

    const relevantSessionId = claimRequestStore.fetchSessionForAddress({
      address,
      daoKey,
    });
    const session = claimRequestStore.getSession(relevantSessionId ?? "");
    if (
      !claimRequestStore.checkIfClaimExistsForAddress({
        address,
        daoKey,
      }) ||
      relevantSessionId == null ||
      session == undefined
    ) {
      return requestFailed(
        res,
        httpStatusCodes.NOT_FOUND,
        "No active Credential Request found with the provided address and typeName."
      );
    }

    const credentialsData = await issuerNodeApiToGetAllCredentials();
    if (
      !credentialsData.status ||
      credentialsData.data == null ||
      credentialsData.data.credentials.length <= 0
    ) {
      return;
    }
    const allCredentials: any[] = credentialsData.data.credentials;

    const { claimLinkId, amId } = session;

    const claimLinkStatus = await issuerNodeApiToCheckClaimLinkStatus(
      claimLinkId
    );
    if (!claimLinkStatus.status || claimLinkStatus.data == null) {
      console.error(
        functionName +
          "Claim link status could not be fetched." +
          claimLinkStatus.message
      );
      return requestFailed(
        res,
        httpStatusCodes.NOT_FOUND,
        "Claim link status could not be fetched."
      );
    }
    if (!claimLinkStatus.data.claimedByUser && claimLinkStatus.data.expired) {
      claimRequestStore.unsetSessionIdObject(relevantSessionId);
      console.log(
        functionName +
          `Claim Link ID: ${claimLinkId}, expired without any claim taking place.`
      );
      return requestFailed(
        res,
        httpStatusCodes.NOT_FOUND,
        `Claim Link ID: ${claimLinkId}, expired without any claim taking place.`
      );
    }
    if (!claimLinkStatus.data.claimedByUser) {
      return requestFailed(
        res,
        httpStatusCodes.BAD_REQUEST,
        `Claim Link ID: ${claimLinkId}, is still active and not claimed.`
      );
    }

    const credentialFilter = allCredentials.filter(
      (v) => v.credentialSubject.refId == amId
    );
    if (credentialFilter.length == 0) {
      console.error(
        functionName +
          "Credential Data unavailable for claim link id " +
          claimLinkId
      );
      return requestFailed(
        res,
        httpStatusCodes.NOT_FOUND,
        "Credential Data unavailable for claim link id " + claimLinkId
      );
    }
    const credential = credentialFilter[0];
    const credentialSubject = credential.credentialSubject;

    const existingCredentialCheck = await getLatestValidCredentialOfAddress({
      address,
      daoKey,
    });
    if (!existingCredentialCheck.status) {
      console.error(
        functionName,
        { session, claimLinkStatus, credential },
        `Failed to fetch the details of existing credentials for ${claimLinkId} claim link id and address ${address}.`,
        existingCredentialCheck.message
      );
      return requestFailed(
        res,
        httpStatusCodes.NOT_FOUND,
        `Failed to fetch the details of existing credentials for ${claimLinkId} claim link id and address ${address}.`
      );
    }
    if (
      existingCredentialCheck.data != null &&
      Object.keys(existingCredentialCheck.data).length == 0
    ) {
      const nodeRevocation = await completeClaimRevocation(
        existingCredentialCheck.data.claimId
      );
      const dbRevocation = await revokeCredential(
        existingCredentialCheck.data.credentialId
      );
      if (!nodeRevocation.status || !dbRevocation.status) {
        console.error(
          functionName,
          {
            data: existingCredentialCheck.data,
            nodeRevocation,
            dbRevocation,
            credential,
            address,
            daoKey,
          },
          "Failed to revoke previous claim",
          nodeRevocation.message + "\n" + dbRevocation.message
        );
        return requestFailed(
          res,
          httpStatusCodes.NOT_FOUND,
          "Failed to revoke previous claim"
        );
      }
    }

    // shortened variable name for ternary operation usage, to check if previous credential existed
    const prevCredExists =
      existingCredentialCheck.data != null &&
      !isEmpty(existingCredentialCheck.data);
    const createCreds = await createNewCredential({
      claimId: credential.id,
      validTill: new Date(credential.expiresAt),
      previousClaimId: prevCredExists
        ? existingCredentialCheck.data?.claimId
        : undefined,
      previousCredentialId: prevCredExists
        ? existingCredentialCheck.data?.credentialId
        : undefined,
        addressId: addressDetails.data.addressId,
        daoId: daoDetails.data.daoId,
        issuedDate: new Date()
    });

    if (!createCreds.status) {
      console.error(
        functionName +
        `Failed to register a new credential for the address ${address} and daoKey ${daoKey}.` +
        createCreds.message
      );
      return requestFailed(
        res,
        httpStatusCodes.NOT_FOUND,
        "No active Credential Request found."
      );
    }
    console.log(
      `Successfully registered a new credential for the address ${address} and daoKey ${daoKey}.`
    );
    claimRequestStore.unsetSessionIdObject(relevantSessionId);

    const qrDataResp = await getQrDataApi(credential.id);
    if (!qrDataResp.status) {
      return requestFailed(
        res,
        httpStatusCodes.BAD_REQUEST,
        qrDataResp.message ?? "Something went wrong, please try again later."
      );
    }
    return responseSuccess(
      res,
      httpStatusCodes.OK,
      qrDataResp.data,
      "Successfully updated the credential status and generated the QR Data for it."
    );
  } catch (error: any) {
    console.error(functionName, {}, "Something went wrong.", error.message);
  }
};

// TODO: improvement, have a cron job that will run periodically to check and delete objects
const isEmpty = (object: any) => {
	if (object == null || object == undefined) return true;
	else return Object.keys(object).length === 0;
};