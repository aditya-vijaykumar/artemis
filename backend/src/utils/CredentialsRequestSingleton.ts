interface ClaimReferenceObject {
  claimLinkId: string;
  amId: string;
  address: string;
  daoKey: string;
}

export class CredentialsRequestSingleton {
  private static instance: CredentialsRequestSingleton | null = null;

  private sessionIdToClaimMap: Map<String, ClaimReferenceObject>;

  private constructor() {
    this.sessionIdToClaimMap = new Map<String, ClaimReferenceObject>();
  }

  public static getInstance() {
    if (!CredentialsRequestSingleton.instance) {
      CredentialsRequestSingleton.instance = new CredentialsRequestSingleton();
    }
    return CredentialsRequestSingleton.instance;
  }

  public setNewRequest({
    address,
    daoKey,
    sessionId,
    claimLinkId,
    amId,
  }: {
    address: string;
    daoKey: string;
    sessionId: string;
    claimLinkId: string;
    amId: string;
  }) {
    const sessionObj = this.sessionIdToClaimMap.get(sessionId);
    if (sessionObj != undefined) {
      return false;
    } else {
      this.sessionIdToClaimMap.set(sessionId, {
        daoKey,
        address,
        claimLinkId,
        amId,
      });
      return true;
    }
  }

  public checkIfClaimExistsForAddress({
    daoKey,
    address,
  }: {
    daoKey: string;
    address: string;
  }): boolean {
    for (const [sessionId, session] of this.sessionIdToClaimMap.entries()) {
      if (
        session != undefined &&
        session.address.toLowerCase() == address.toLowerCase() &&
        session.daoKey.toLowerCase() == daoKey.toLowerCase()
      ) {
        return true;
      }
    }
    return false;
  }

  public fetchSessionForAddress({
    daoKey,
    address,
  }: {
    daoKey: string;
    address: string;
  }) {
    for (const [sessionId, session] of this.sessionIdToClaimMap.entries()) {
      if (
        session != undefined &&
        session.address.toLowerCase() == address.toLowerCase() &&
        session.daoKey.toLowerCase() == daoKey.toLowerCase()
      ) {
        return sessionId.toString();
      }
    }
    return null;
  }

  public checkForSessionId(sessionId: string): boolean {
    const session = this.sessionIdToClaimMap.get(sessionId);
    if (session == undefined) {
      return false;
    } else {
      return true;
    }
  }

  public getSession(sessionId: string) {
    return this.sessionIdToClaimMap.get(sessionId);
  }

  public getAllSessions() {
    return this.sessionIdToClaimMap;
  }

  public unsetSessionIdObject(sessionId: string): boolean {
    return this.sessionIdToClaimMap.delete(sessionId);
  }

  public resetAll() {
    this.sessionIdToClaimMap = new Map<String, ClaimReferenceObject>();
    return;
  }
}
