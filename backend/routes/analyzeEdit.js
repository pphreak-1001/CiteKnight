const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post('/', async (req, res) => {
  const { title, summary, patch } = req.body;

  if (!title || !summary || !patch) {
    return res.status(400).json({ feedback: ["Missing required fields: title, summary, or patch."] });
  }

  const prompt = `
You are an expert on Wikipedia's editing policies (https://en.wikipedia.org/wiki/Wikipedia:Editing_policy).

A user has submitted a proposed edit to a Wikipedia article. You must review the edit and for **each line** in the patch, indicate if it violates any **Wikipedia editing policy**, and if so:

- Quote the exact line
- Describe the **specific reason** it violates policy
- Cite the **relevant Wikipedia policy** (e.g. "Wikipedia:Verifiability", "Wikipedia:Neutral point of view", etc.)

Only include lines that **clearly violate policy**. If all lines are compliant, respond with:  
**No policy violations detected.**

📘 Article Title:
${title}

🧾 Current Article Summary:
${summary}

✏️ Proposed Edit:
${patch}

🎯 Output format (strictly follow this structure):

1. 🚫 "**<line content>**"  
   🔍 Violation: <explanation of what's wrong>  
   📚 Policy: <Wikipedia policy name with link>

Repeat for each violating line.
  `.trim();

  try {
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    });

    const responseText = gptResponse.choices[0].message.content.trim();
    const feedback = responseText.split("\n").filter(line => line.trim() !== "");

    res.json({ feedback });
  } catch (error) {
    console.error("❌ Error in GPT request:", error);
    res.status(500).json({ feedback: ["An error occurred while analyzing the edit."] });
  }
});

module.exports = router;
