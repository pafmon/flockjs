const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const LogSchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  environment: { type: String, required: true },
  category: { type: String, required: true },
  createdBy: { type: String, required: true },
  message: { type: String, required: true },
});

LogSchema.index({ createdBy: 1, category: 1 });

module.exports = mongoose.model("Log", LogSchema);
