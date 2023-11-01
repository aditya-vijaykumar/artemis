/*
  Warnings:

  - Added the required column `daoName` to the `DAO` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DAO" ADD COLUMN     "daoName" TEXT NOT NULL;
