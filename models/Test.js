const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TestSchema = new Schema({
  environment: { type: String },
  session: { type: String, required: true },
  description: { type: String, required: true },
  exercises: { type: Array },
  activeSince: { type: Date },
  orderNumber: { type: Number },
});

module.exports = mongoose.model("Test", TestSchema);
