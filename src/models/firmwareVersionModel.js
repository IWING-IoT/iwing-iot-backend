const mongoose = require("mongoose");

const defaultMarkdown =
  '# Sample Markdown Title\n \
\n\
This is a sample piece of markdown text to illustrate how markdown works. You can add **bold** text, *italicized* text, and even `inline code` snippets.\n\
\n\
## Subheading\n\
- List item one\n\
- List item two\n\
- List item three\n\
\n\
```python\n\
# Here\'s a code block\n\
print("Hello, Markdown!")\n\
```\n\
';

const firmwareVersionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "FirmwareVersion must has a name"],
  },
  firmwareId: {
    type: mongoose.Schema.ObjectId,
    ref: "Firmware",
    required: [true, "FirmwareVersion must has a firmwareId"],
  },
  description: String,
  gitUrl: String,
  filename: {
    type: String,
    required: [true, "FirmwareVersion must has a filename"],
  },
  fileExtension: {
    type: String,
    required: [true, "FirmwareVersion must has a fileExtension"],
  },
  markdown: {
    type: String,
    default: defaultMarkdown,
  },
  createdAt: Date,
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  createdAt: Date,
  editedAt: Date,
  editedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
});

const FirmwareVersion = mongoose.model(
  "FirmwareVersion",
  firmwareVersionSchema
);

module.exports = FirmwareVersion;
