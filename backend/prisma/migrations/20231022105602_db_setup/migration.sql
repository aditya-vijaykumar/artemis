-- CreateTable
CREATE TABLE "Address" (
    "addressId" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("addressId")
);

-- CreateTable
CREATE TABLE "DAO" (
    "daoId" UUID NOT NULL,
    "daoKey" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "contractAddress" TEXT NOT NULL,

    CONSTRAINT "DAO_pkey" PRIMARY KEY ("daoId")
);

-- CreateTable
CREATE TABLE "PolygonIdCredentialIssued" (
    "credentialId" UUID NOT NULL,
    "addressId" UUID NOT NULL,
    "daoId" UUID NOT NULL,
    "claimId" TEXT NOT NULL,
    "validTill" TIMESTAMPTZ(6) NOT NULL,
    "issuedDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "previousClaimId" TEXT,
    "previousCredentialId" UUID,

    CONSTRAINT "PolygonIdCredentialIssued_pkey" PRIMARY KEY ("credentialId")
);

-- CreateIndex
CREATE UNIQUE INDEX "DAO_daoKey_key" ON "DAO"("daoKey");

-- CreateIndex
CREATE UNIQUE INDEX "DAO_contractAddress_key" ON "DAO"("contractAddress");

-- CreateIndex
CREATE UNIQUE INDEX "PolygonIdCredentialIssued_previousCredentialId_key" ON "PolygonIdCredentialIssued"("previousCredentialId");

-- AddForeignKey
ALTER TABLE "PolygonIdCredentialIssued" ADD CONSTRAINT "PolygonIdCredentialIssued_previousCredentialId_fkey" FOREIGN KEY ("previousCredentialId") REFERENCES "PolygonIdCredentialIssued"("credentialId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PolygonIdCredentialIssued" ADD CONSTRAINT "PolygonIdCredentialIssued_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("addressId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PolygonIdCredentialIssued" ADD CONSTRAINT "PolygonIdCredentialIssued_daoId_fkey" FOREIGN KEY ("daoId") REFERENCES "DAO"("daoId") ON DELETE NO ACTION ON UPDATE NO ACTION;
