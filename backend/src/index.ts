import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import routes from "./routes/index";


const app = express();
app.disable("x-powered-by");
const port = process.env.PORT;

app.use(
  // TODO: Revisit to see if this needs to be changed
  bodyParser.json({
    limit: "5mb",
  })
);

app.use(cors());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");

  next();
});

app.use(routes);


app.listen(port, async () => {
  console.log(`Server listening in dev mode to port ${port} - ${new Date()}`);
});
