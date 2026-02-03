const express = require("express"); // express
const http = require("http"); // build in node http module

// this accepts / tracks / broadcasts events
const { Server } = require("socket.io");

// cors middleware
const cors = require("cors");

// load env files
require("dotenv").config();

// importing our supabase client for db updates
const supabase = require("./supabase");


const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// socket io hooking to the http server
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

// managing socket connections here
io.on("connection", (socket) => {
    // console.log("User connected:", socket.id);


    socket.on("bidPlaced", async ({ itemId, bidAmount, bidder }, callback) => {
        // retrieve that item's informaton
        const { data: item, error } = await supabase.from("items").select("current_bid").eq("id", itemId).single();

        // check if item exists
        if (error || !item) {
            callback({ success: false, error: "Item not found" });
            return;
        }

        // confirm if incremet is of +10
        if (bidAmount !== item.current_bid + 10) {
            callback({
                success: false,
                error: "Bid must increase by exactly 10",
            });
            return;
        }

        // update the amount in the database
        const { error: updateError } = await supabase
            .from("items").update({ current_bid: bidAmount }).eq("id", itemId);

        if (updateError) {
            callback({ success: false, error: "Database error" });
            return;
        }

        // broadcast update
        io.emit("bidUpdated", {
            itemId,
            newBid: bidAmount,
            bidder
        });

        // ACK success
        callback({ success: true });
    });

});

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
    });
})


const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
