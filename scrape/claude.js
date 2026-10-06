
import axios from 'axios';

const generateApiKey = () => {
    const r = Math.floor(1e11 * Math.random());
    return "tryit-" + r + "-" + "a3edf17b505349f1794bcdbc7290a045";
};

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const askClaude = async (question) => {
    try {
        const apiKey = generateApiKey();
        const sessionUuid = generateUUID();

        const indoPrompt = `Gunakan bahasa Indonesia yang natural, asik, dan mudah dipahami untuk menjawab. Jika pertanyaannya santai, jawablah dengan santai juga.\n\nPertanyaan user: ${question}`;

        const payload = new URLSearchParams({
            'chat_style': 'claudeai_0',
            'chatHistory': JSON.stringify([{ role: "user", content: indoPrompt }]),
            'model': 'standard',
            'session_uuid': sessionUuid,
            'hacker_is_stinky': 'very_stinky'
        });

        const { data } = await axios.post("https://api.deepai.org/hacking_is_a_serious_crime", payload.toString(), {
            headers: {
                "api-key": apiKey,
                "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
                "referer": "https://deepai.org/chat/claude-3-haiku",
                "content-type": "application/x-www-form-urlencoded",
                "accept": "*/*"
            }
        });

        return data;
    } catch (error) {
        throw new Error(error.response?.data || error.message);
    }
};

export default askClaude;
