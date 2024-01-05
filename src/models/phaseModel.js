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
const phaseSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.ObjectId,
    ref: "Project",
    required: [true, "Phase must has projectID"],
  },
  name: {
    type: String,
    required: [true, "Phase must has a name"],
    maxlength: 100,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  startedAt: {
    type: Date,
    required: [true, "Phase must has a start date"],
  },
  description: {
    type: String,
    default: defaultMarkdown,
  },
  endedAt: Date,
  createdAt: Date,
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  editedAt: Date,
  editedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
});

const Phase = mongoose.model("Phase", phaseSchema);

module.exports = Phase;
