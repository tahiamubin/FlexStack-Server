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
    const allClassCollection = database.collection("allClass");
    const applyTrainerCollection = database.collection("applyTrainer");
    const favoriteCollection = database.collection("memberFavorite");
    const paymentCollection = database.collection("subscription");
    const userCollection = database.collection("user");

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );

    // member payment

    app.get("/api/payment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { userId: id };
      const result = await paymentCollection.find(query).toArray();
      res.json(result);
    });

    app.post("/api/payment", async (req, res) => {
      const { sessionId, userId, className, classId, schedule, userEmail } =
        req.body;
      const isExits = await paymentCollection.findOne({ sessionId });
      if (isExits) {
        return res.json({ msg: "Already exits!" });
      }

      await paymentCollection.insertOne({
        sessionId,
        userId,
        className,
        schedule,
        userEmail,
        classId,
      });
      await userCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { plan: "pro" } },
      );
      res.json({ msg: "Payment successful!" });
    });

    // member page

   app.get("/api/favorite", async (req, res) => {
      const {memberId} = req.query
      const result = await favoriteCollection.find({memberId: memberId}).toArray();
      res.json(result);
    });


    
   app.get("/api/apply-trainer", async (req, res) => {
      const {memberId} = req.query
      const result = await applyTrainerCollection.find({memberId: memberId}).toArray();
      res.json(result);
    });

    
    app.post("/api/apply-trainer", async (req, res) => {
      const data = req.body;
      const result = await applyTrainerCollection.insertOne(data);
      res.json(result);
    });

    // all class
    app.get("/api/all-classes/:id", async (req, res) => {
      // book now
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await allClassCollection.findOne(query);
      res.json(result);
    });

    app.patch("/api/all-class/:id", async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;
      const result = await allClassCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData },
      );
      res.json(result);
    });

    app.delete("/api/all-class/:id", async (req, res) => {
      const { id } = req.params;
      console.log("Received id:", id);
      const result = await allClassCollection.deleteOne({
        _id: new ObjectId(id),
      });
      console.log("Delete result:", result);
      res.json(result);
    });

    app.get("/api/all-class", async (req, res) => {
      const result = await allClassCollection.find().toArray();
      return res.json(result);
    });

    app.post("/api/all-class", async (req, res) => {
      try {
        const data = req.body;
        const result = await allClassCollection.insertOne(data);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message }); // fixed: error, not err
      }
    });

    // community forum

    app.delete("/api/community-forum/:id", async (req, res) => {
      const { id } = req.params;
      //console.log("Received id:", id);
      const result = await communityCollection.deleteOne({
        _id: new ObjectId(id),
      });
      console.log("Delete result:", result);
      res.json(result);
    });

    
    app.post("/api/community-forum/:id/comment", async (req, res) => {
      // Add comment
      const { id } = req.params;
      const comment = { ...req.body, createdAt: new Date() };
      await communityCollection.updateOne(
        { _id: new ObjectId(id) },
        { $push: { comments: comment } },
      );
      res.json({ success: true });
    });

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
      // latest post
      const result = await communityCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();
      return res.json(result);
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
