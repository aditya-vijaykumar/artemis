import axios, { AxiosError } from "axios";
import { responseFn } from "./dynamicReturnFunction";

export const issuerNodeApiToCreateClaimLink = async ({
  schemaID,
  credentialExpiration,
  expiration,
  credentialSubject,
}: {
  schemaID: string;
  credentialExpiration: string;
  expiration: string;
  credentialSubject: object;
}) => {
  try {
    const BASE_URL = process.env.POLYGON_ID_ISSUER_API_URL;
    const username = process.env.POLYGON_ID_ISSUER_API_USERNAME;
    const password = process.env.POLYGON_ID_ISSUER_API_PASSWORD;
    const auth = Buffer.from(`${username}:${password}`).toString("base64");

    const body = {
      schemaID,
      credentialExpiration,
      expiration,
      limitedClaims: 1,
      signatureProof: true,
      mtProof: true,
      credentialSubject,
    };

    const createClaimLink = await axios.post(
      `${BASE_URL}/credentials/links`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + auth,
        },
      }
    );

    if (createClaimLink.status != 201 && createClaimLink.data.id == undefined) {
      return responseFn(false, null, "Could not create claim link.");
    }

    return responseFn(
      true,
      { id: createClaimLink.data.id },
      "Created claim link."
    );
  } catch (error: any) {
    const err: AxiosError = error;
    console.error(
      "issuerNodeApiToCreateClaimLink",
      { schemaID, credentialExpiration, expiration, credentialSubject },
      "Service-API-Error",
      error.message + JSON.stringify(err.response?.data)
    );
    return responseFn(false, null, error.message);
  }
};

export const issuerNodeApiToCreateClaimQRCode = async (claimLinkId: string) => {
  try {
    const BASE_URL = process.env.POLYGON_ID_ISSUER_API_URL;
    const username = process.env.POLYGON_ID_ISSUER_API_USERNAME;
    const password = process.env.POLYGON_ID_ISSUER_API_PASSWORD;
    const auth = Buffer.from(`${username}:${password}`).toString("base64");

    const createClaimQr = await axios.post(
      `${BASE_URL}/credentials/links/${claimLinkId}/qrcode`,
      null,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + auth,
        },
      }
    );

    if (createClaimQr.status != 200 && createClaimQr.data.qrCode == undefined) {
      return responseFn(false, null, "Could not create claim qr code.");
    }

    return responseFn(
      true,
      { qrCode: createClaimQr.data.qrCode, data: createClaimQr.data },
      "Created claim link."
    );
  } catch (error: any) {
    const err: AxiosError = error;
    console.error(
      "issuerNodeApiToCreateClaimQRCode",
      { claimLinkId },
      "Service-API-Error",
      error.message + JSON.stringify(err.response?.data)
    );
    return responseFn(false, null, error.message);
  }
};

export const issuerNodeApiToCheckClaimLinkStatus = async (
  claimLinkId: string
) => {
  try {
    const BASE_URL = process.env.POLYGON_ID_ISSUER_API_URL;
    const username = process.env.POLYGON_ID_ISSUER_API_USERNAME;
    const password = process.env.POLYGON_ID_ISSUER_API_PASSWORD;
    const auth = Buffer.from(`${username}:${password}`).toString("base64");

    const claimLinkStatus = await axios.get(
      `${BASE_URL}/credentials/links/${claimLinkId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + auth,
        },
      }
    );

    if (
      claimLinkStatus.status != 200 &&
      claimLinkStatus.data.active == undefined
    ) {
      return responseFn(false, null, "Could not retrieve claim link status.");
    }

    const expired: boolean =
      new Date(claimLinkStatus.data.expiration).getTime() <
      new Date().getTime();
    const claimedByUser: boolean =
      claimLinkStatus.data.issuedClaims == claimLinkStatus.data.maxIssuance &&
      claimLinkStatus.data.issuedClaims == 1;

    return responseFn(
      true,
      { expired, claimedByUser },
      "Retrieved claim link status."
    );
  } catch (error: any) {
    const err: AxiosError = error;
    console.error(
      "issuerNodeApiToCheckClaimLinkStatus",
      { claimLinkId },
      "Service-API-Error",
      error.message + JSON.stringify(err.response?.data)
    );
    return responseFn(false, null, error.message);
  }
};

export const issuerNodeApiToGetAllCredentials = async () => {
  try {
    const BASE_URL = process.env.POLYGON_ID_ISSUER_API_URL;
    const username = process.env.POLYGON_ID_ISSUER_API_USERNAME;
    const password = process.env.POLYGON_ID_ISSUER_API_PASSWORD;
    const auth = Buffer.from(`${username}:${password}`).toString("base64");

    const credentials = await axios.get(`${BASE_URL}/credentials`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + auth,
      },
    });

    if (credentials.status != 200 && !Array.isArray(credentials.data)) {
      return responseFn(false, null, "Could not retrieve all the credentials.");
    }

    return responseFn(
      true,
      { credentials: credentials.data },
      "Retrieved all the credentials."
    );
  } catch (error: any) {
    const err: AxiosError = error;
    console.error(
      "issuerNodeApiToGetAllCredentials",
      {},
      "Service-API-Error",
      error.message + JSON.stringify(err.response?.data)
    );
    return responseFn(false, null, error.message);
  }
};

export const completeClaimRevocation = async (claimId: string) => {
  try {
    const fetchNonce = await issuerNodeApiToFetchRevocationNonce(claimId);
    if (!fetchNonce.status || fetchNonce.data == null) {
      return responseFn(
        false,
        null,
        fetchNonce.message ?? "Could not fetch the nonce."
      );
    }

    const revokeTheClaim = await issuerNodeApiToRevokeClaim(
      fetchNonce.data.revocationNonce
    );
    if (!revokeTheClaim.status) {
      return responseFn(
        false,
        null,
        revokeTheClaim.message ?? "Could not revoke the claim."
      );
    }
    return responseFn(true, revokeTheClaim.data, "Revoked the claim.");
  } catch (error: any) {
    const err: AxiosError = error;
    console.error(
      "completeClaimRevocation",
      { claimId },
      "Service-API-Error",
      error.message + JSON.stringify(err.response?.data)
    );
    return responseFn(false, null, error.message);
  }
};

export const issuerNodeApiToFetchRevocationNonce = async (claimId: string) => {
  try {
    const BASE_URL = process.env.POLYGON_ID_ISSUER_API_URL;
    const username = process.env.POLYGON_ID_ISSUER_API_USERNAME;
    const password = process.env.POLYGON_ID_ISSUER_API_PASSWORD;
    const auth = Buffer.from(`${username}:${password}`).toString("base64");

    const getClaim = await axios.get(`${BASE_URL}/credentials/${claimId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + auth,
      },
    });
    if (getClaim.status != 200 || getClaim.data.revNonce == undefined) {
      return responseFn(
        false,
        null,
        `Could not fetch the revocation nonce for claim id ${claimId}.`
      );
    }

    return responseFn(
      true,
      { revocationNonce: getClaim.data.revNonce },
      "Got the revocation nonce for the given claim id."
    );
  } catch (error: any) {
    const err: AxiosError = error;
    console.error(
      "issuerNodeApiToFetchRevocationNonce",
      { claimId },
      "Service-API-Error",
      error.message + JSON.stringify(err.response?.data)
    );
    return responseFn(false, null, error.message);
  }
};

export const issuerNodeApiToRevokeClaim = async (nonce: number) => {
  try {
    const BASE_URL = process.env.POLYGON_ID_ISSUER_API_URL;
    const username = process.env.POLYGON_ID_ISSUER_API_USERNAME;
    const password = process.env.POLYGON_ID_ISSUER_API_PASSWORD;
    const auth = Buffer.from(`${username}:${password}`).toString("base64");

    const revokeClaim = await axios.post(
      `${BASE_URL}/credentials/revoke/${nonce}`,
      null,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + auth,
        },
      }
    );
    if (revokeClaim.status != 200 && revokeClaim.status != 202) {
      return responseFn(false, null, `Could not revoke the claim.`);
    }

    return responseFn(
      true,
      revokeClaim.data,
      "Revocation of the claim is complete."
    );
  } catch (error: any) {
    const err: AxiosError = error;
    console.error(
      "issuerNodeApiToRevokeClaim",
      { revocationNonce: nonce },
      "Service-API-Error",
      error.message + JSON.stringify(err.response?.data)
    );
    return responseFn(false, null, error.message);
  }
};

export const getQrDataApi = async (claimId: string) => {
  try {
    const BASE_URL = process.env.POLYGON_ID_ISSUER_API_URL;
    const username = process.env.POLYGON_ID_ISSUER_API_USERNAME;
    const password = process.env.POLYGON_ID_ISSUER_API_PASSWORD;
    const auth = Buffer.from(`${username}:${password}`).toString("base64");

    const qrData = await axios.get(
      `${BASE_URL}/credentials/${claimId}/qrcode`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + auth,
        },
      }
    );
    return responseFn(true, qrData.data, "Got QR Data.");
  } catch (error: any) {
    const err: AxiosError = error;
    console.error(
      "getQrDataApi" + claimId + "Utils-API-Error",
      error.message + JSON.stringify(err.response?.data)
    );
    return responseFn(false, null, error.message);
  }
};
