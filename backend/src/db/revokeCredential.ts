import prisma from "../config/prisma";
import { responseFn } from "../utils/dynamicReturnFunction";

export const revokeCredential = async (credentialId: string) => {
  try {
    const result = await prisma.polygonIdCredentialIssued.update({
      where: {
        credentialId,
      },
      data: {
        revoked: true,
        updatedAt: new Date(),
      },
    });
    if (result == null) {
      return responseFn(false, result);
    }
    return responseFn(true, result);
  } catch (error: any) {
    console.error("ERROR - revokeCredential - " + error.message);
    return responseFn(false, null);
  }
};
