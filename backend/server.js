const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const analyzeEdit = require('./routes/analyzeEdit');

app.use((req, res, next) => {
  console.log(`📥 [${req.method}] ${req.originalUrl}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Request Body:', req.body);
  }

  const oldSend = res.send;
  res.send = function (data) {
    console.log(`📤 Response to [${req.method}] ${req.originalUrl}:`);
    try {
      console.log(JSON.parse(data));
    } catch {
      console.log(data);
    }
    return oldSend.apply(res, arguments);
  };

  next();
});

app.use(cors());
app.use(express.json());

app.use('/analyzeEdit', analyzeEdit);

app.listen(1337, () => console.log("🚀 Server running on http://localhost:1337"));
