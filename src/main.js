const express = require("express");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

app.post("/api/register", upload.single("image"), async (req, res) => {
  try {
    const { name } = req.body;
    const imagePath = req.file.path;
    const response = await axios.post(
      "http://127.0.0.1:5001/register",
      {
        name,
        image: require("fs").createReadStream(imagePath),
      },
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ status: "fail", message: err.message });
  }
});

app.post("/api/recognize", upload.single("image"), async (req, res) => {
  try {
    const imagePath = req.file.path;
    const response = await axios.post(
      "http://127.0.0.1:5001/recognize",
      {
        image: require("fs").createReadStream(imagePath),
      },
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ status: "fail", message: err.message });
  }
});

app.listen(5000, () => console.log("Node backend running on port 5000"));
