import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(express.json());

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.post("/chat", async (req, res) => {

    const messages = req.body.messages;

    try {

        const response = await client.chat.completions.create({

            model: "gpt-4.1-mini",

            messages: messages

        });

        res.json({

            reply: response.choices[0].message.content

        });

    } catch(err){

        console.log(err);

        res.status(500).json({

            reply:"AI Error"

        });

    }

});

app.listen(3000, () => {
    console.log("Server berjalan di port 3000");
});