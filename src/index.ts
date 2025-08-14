import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { z } from "zod";

const app = express();

const mcpServer = new McpServer({
  name: "Hacker News",
  version: "1.0.0",
  // capabilities: {
  //   sse: true,
  // },
});

mcpServer.tool(
  "get_hacker_news_stories",
  "Get the stories from Hacker News",
  {
    type: z.enum(["topstories", "newstories", "beststories"]),
    amount: z.number().min(1).max(100).default(10),
  },
  async ({ type, amount }) => {
    const response = await fetch(
      `https://hacker-news.firebaseio.com/v0/${type}.json`
    );
    const ids = await response.json();
    const stories = await Promise.all(
      ids.slice(0, amount).map(async (id: number) => {
        const storyResponse = await fetch(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`
        );
        return storyResponse.json();
      })
    );
    return {
      content: stories.map((story: any) => ({
        type: "text",
        text: story.title,
      })),
    };
  }
);

let transport: SSEServerTransport | null = null;

// 服务端给客户端长连接推送数据的接口
app.get("/sse", (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  mcpServer.connect(transport);
});

// 客户端给服务端推送数据的接口
app.post("/messages", (req, res) => {
  if (transport) {
    transport.handlePostMessage(req, res);
  }
});

app.listen(3002, () => {
  console.log("Server is running on port 3002");
});
