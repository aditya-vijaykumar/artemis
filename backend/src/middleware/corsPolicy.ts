import { Request, Response, NextFunction } from "express";
import cors from "cors";

const whitelist = [
  "http://localhost:3000",
  "http://localhost:3001"
];

const corsOptions = {
  origin: function (origin: any, callback: any) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST"],
};

export const checkForCors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const corsHandler = cors(corsOptions);
  return corsHandler(req, res, next);
};
