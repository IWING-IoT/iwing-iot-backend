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
const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "A project must has a name"],
    maxlength: 100,
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "A project must has a owner Id"],
  },
  location: {
    type: String,
    required: [true, "A project must has a location"],
  },
  template: {
    type: mongoose.Schema.ObjectId,
    required: [true, "A project must has a template"],
  },
  startedAt: {
    type: Date,
    required: [true, "A project must has a started date"],
  },
  description: {
    type: String,
    default: defaultMarkdown,
  },
  endedAt: Date,
  createdAt: Date,
  isArchived: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
  editedAt: Date,
  editedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
});

const Project = mongoose.model("Project", projectSchema);

module.exports = Project;
