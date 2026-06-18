const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
//const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URI;

const app = express();
app.use(express.json());
const port = process.env.PORT;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
// const JWKS = createRemoteJWKSet(
//   new URL(`${process.env.CLIENT_UR}/api/auth/jwks`),
// );

// middle ware
// const verifyToken = (req, res, next) => {
//   const authorization = req.header.authorization;
//   if (!authorization || !authorization.startWith("Bearer")) {
//     return res.status(401).json({ msg: "unauthorized" });
//   }
//   const token = authorization.split(" ")[1];
//   if (!token) {
//     return res.status(401).json({ msg: "unauthorized" });
//   }
//   try {
//    const {payload} = await jwtVerify(token, JWKS)
//    //console.log(payload)
//    req.user = payload
//    next()
//   } catch (error){
//     return res.status(401).json({msg: "unauthorized"})
//   }
// };

// verify role

// const verifySeller = (req, res, next) => {
//  const user = req.user
//  if(user.role !== 'seller' || user.plan !== 'pro'){
//  return res.status(403).json({msg: "forbidden"})
//  }
//  next()
// }

async function run() {
  try {
    await client.connect();
    const database = client.db("assignment10");
    const communityCollection = database.collection("community");

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );

    // community forum

    app.get("/api/community-forum/:id", async (req, res) => {
      // details page
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await communityCollection.findOne(query);
      res.json(result);
    });

    app.get("/api/community-forum", async (req, res) => {
      // community page
      const result = await communityCollection.find().toArray();
      return res.json(result);
    });

    app.post("/api/community-forum", async (req, res) => {
      try {
        const data = req.body;
        const result = await communityCollection.insertOne(data);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: err.message });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
