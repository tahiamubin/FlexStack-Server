const dotenv = require("dotenv");

dotenv.config();
const express = require("express");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

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

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

//middle ware
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  //console.log("authorization header:", authorization)
  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res.status(401).json({ msg: "unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ msg: "unauthorized" });
  }
  try {
    const { payload } = await jwtVerify(token, JWKS);
    //console.log("payload", payload);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ msg: "unauthorized" });
  }
};

//verify role

const verifyTrainer = async (req, res, next) => {
  const user = req.user;
  if (user.role !== "trainer") {
    return res.status(403).json({ msg: "forbidden" });
  }
  next();
};
const verifyAdmin = async (req, res, next) => {
  const user = req.user;
  if (user.role !== "admin") {
    return res.status(403).json({ msg: "forbidden" });
  }
  next();
};
const verifyMember = async (req, res, next) => {
  const user = req.user;
  if (user.role !== "member") {
    return res.status(403).json({ msg: "forbidden" });
  }
  next();
};

async function run() {
  try {
    // await client.connect();
    const database = client.db("assignment10");
    const communityCollection = database.collection("community");
    const allClassCollection = database.collection("allClass");
    const applyTrainerCollection = database.collection("applyTrainer");
    const favoriteCollection = database.collection("memberFavorite");
    const paymentCollection = database.collection("subscription");
    const userCollection = database.collection("user");
    const communityCommentCollection = database.collection("comment");
    //const forumCollection = database.collection("forum");

    //await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );

    // manage users by admin

    app.patch(
      "/api/manage-user/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { id } = req.params;
        const updatedData = req.body;
        const result = await userCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData },
        );
        res.json(result);
      },
    );

    // trainer application
    app.patch("/apply-trainer/:postId", async (req, res) => {
      const { status } = req.body;
      const { postId } = req.params;

      const application = await applyTrainerCollection.findOne({
        _id: new ObjectId(postId),
      });

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      await applyTrainerCollection.updateOne(
        { _id: new ObjectId(postId) },
        { $set: { status } },
      );

      if (status === "approved") {
        await userCollection.updateOne(
          { _id: new ObjectId(application.userId) },
          { $set: { role: "trainer" } },
        );
      }

      res.json({ message: `Application ${status}` });
    });

    // all user

    app.get("/api/alluser", async (req, res) => {
      const result = await userCollection.find().toArray();
      return res.json(result);
    });

    // total enrollment of a trainer's  classes
    app.get("/trainer/:trainerId/total-enrollment", async (req, res) => {
      try {
        const trainerClasses = await allClassCollection
          .find({ userId: req.params.trainerId })
          .toArray();
        const classIds = trainerClasses.map((c) => c._id.toString());
        const totalEnrolled = await paymentCollection.countDocuments({
          classId: { $in: classIds },
        });
        res.json({ totalEnrolled });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // member payment

    app.get("/api/payment", verifyToken, async (req, res) => {
      const result = await paymentCollection.find().toArray();
      return res.json(result);
    });

    app.get("/api/payment-class/:id", verifyToken, async (req, res) => {
      // member booking page
      const id = req.params.id;
      //console.log(id)
      const query = { _id: new ObjectId(id) };
      const result = await paymentCollection.findOne(query);
      res.json(result);
    });

    app.get("/api/payment/:id", verifyToken, async (req, res) => {
      // overview booking number
      const id = req.params.id;
      //console.log(id)
      const query = { userId: id };
      const result = await paymentCollection.find(query).toArray();
      res.json(result);
    });

    app.post("/api/payment", async (req, res) => {
      try {
        const {
          sessionId,
          userId,
          className,
          classId,
          schedule,
          userEmail,
          price,
        } = req.body;

        const user = await userCollection.findOne({
          _id: new ObjectId(userId),
        });
        //console.log("USER:", user);

        if (user?.isBlocked) {
          return res.status(403).json({ error: "Your account is blocked." });
        }

        const alreadyBooked = await paymentCollection.findOne({
          userId,
          classId,
        });
        if (alreadyBooked) {
          console.log("already booked", alreadyBooked);
          return res.status(403).json({ error: "Already Booked." });
        }

        await paymentCollection.insertOne({
          sessionId,
          userId,
          className,
          schedule,
          userEmail,
          classId,
          price,
        });

        await userCollection.updateOne(
          { _id: userId },
          { $set: { plan: "pro" } },
        );

        res.json({ msg: "Payment successful!" });
      } catch (err) {
        console.error("ERROR:", err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // member page

    app.delete(
      "/api/favorite/:id",
      verifyToken,
      verifyMember,
      async (req, res) => {
        const { id } = await req.params;
        const result = await favoriteCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.json(result);
      },
    );

    app.get("/api/favorite", async (req, res) => {
      const { memberId } = req.query;
      const result = await favoriteCollection
        .find({ memberId: memberId })
        .toArray();
      res.json(result);
    });

    app.post("/api/favorite", verifyToken, async (req, res) => {
      try {
        const data = req.body;
        const result = await favoriteCollection.insertOne(data);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/api/apply-trainer", async (req, res) => {
      const { memberId } = req.query;
      const result = await applyTrainerCollection
        .find({ memberId: memberId })
        .toArray();
      res.json(result);
    });

    app.post(
      "/api/apply-trainer",
      verifyToken,

      async (req, res) => {
        const {
          userId,
          userEmail,
          userName,
          experience,
          specialty,
          bio,
          status,
        } = req.body;
        const user = await userCollection.findOne({
          _id: new ObjectId(userId),
        });
        if (user?.isBlocked) {
          return res.status(403).json({ error: "Your account is blocked." });
        }
        const result = await applyTrainerCollection.insertOne({
          userId,
          userEmail,
          userName,
          experience,
          specialty,
          bio,
          status,
          appliedAt: new Date(),
        });
        res.json(result);
      },
    );

    // all class

    app.get("/api/classes-latest", async (req, res) => {
      // latest post
      const result = await allClassCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();
      return res.json(result);
    });
    app.get("/api/all-classes/:id", verifyToken, async (req, res) => {
      // book now
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await allClassCollection.findOne(query);
      res.json(result);
    });

    app.patch("/api/all-class/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;
      const result = await allClassCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData },
      );
      res.json(result);
    });

    app.delete("/api/all-class/:id", verifyToken, async (req, res) => {
      const { id } = req.params;

      const result = await allClassCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.json(result);
    });

    app.get("/api/all-class", async (req, res) => {
      const { search } = req.query;
      const query = {};
      if (search && search !== "undefined") {
        // query = {className: {$regex: search , $options: 'i'}}
        query.$or = [
          { className: { $regex: search, $options: "i" } },
          {
            description: { $regex: search, $options: "i" },
          },
        ];
      }
      const result = await allClassCollection.find(query).toArray();
      return res.json(result);
    });

    app.post("/api/all-class", verifyToken, verifyTrainer, async (req, res) => {
      try {
        const data = req.body;
        const result = await allClassCollection.insertOne(data);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message }); // fixed: error, not err
      }
    });

    // community forum

    app.delete("/api/community-forum/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      console.log("Received id:", id);
      const result = await communityCollection.deleteOne({
        _id: new ObjectId(id),
      });
      console.log("Delete result:", result);
      res.json(result);
    });

    // Add comment

    

    app.post("/api/community-forum/:postId/comment", async (req, res) => {
      const { postId } = req.params;
      const { text, userId, name } = req.body;

      const comment = {
        postId: new ObjectId(postId),
        userId,
        name,
        text,
        createdAt: new Date(),
      };
      const result = await communityCommentCollection.insertOne(comment);
      res.json(result);
    });

    app.get("/api/community-forum/:postId/comment", async (req, res) => {
      const postId = req.params.postId;
      const query = {
        postId: new ObjectId(postId)
      }
      const result = await communityCommentCollection.find(query).toArray();
      res.json(result);
    });

    app.get("/api/community-forum/:id", verifyToken, async (req, res) => {
      // details page
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await communityCollection.findOne(query);
      res.json(result);
    });

    app.get("/api/community-latest", async (req, res) => {
      // latest post
      const result = await communityCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();
      return res.json(result);
    });

    app.get("/api/community-forum", async (req, res) => {
      const { page = 1, limit = 9 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const result = await communityCollection
        .find()
        .skip(skip)
        .limit(Number(limit))
        .toArray();
      const totalData = await communityCollection.countDocuments();
      const totalPage = Math.ceil(totalData / Number(limit));

      return res.json({ data: result, page: Number(page), totalPage });
    });

    app.post("/api/community-forum", verifyToken, async (req, res) => {
      try {
        const data = req.body;
        const result = await communityCollection.insertOne(data);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    //await client.db("admin").command({ ping: 1 });
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
