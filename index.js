const express = require("express");
const cors = require("cors");
// const data = require("./data");
const { log } = require("node:console");

const admin = require("firebase-admin");

const app = express();

app.use(cors()); // 允許跨域請求（讓前端可以打這個 API）
app.use(express.json()); // 解析請求 body 裡的 JSON 格式資料

// const serviceAccount = require("./firebase-service-account.json");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://foodie-2026-default-rtdb.asia-southeast1.firebasedatabase.app/",
});

const db = admin.database();

//---------------------------------1. 餐廳相關API------------------------------------------------

//取得所有/多間餐廳
// app.get("/restaurants", (req, res) => {
//   const { category, keyword } = req.query;
//   let filtered = data.restaurants;

//   //依分類篩選
//   if (category) {
//     filtered = filtered.filter(
//       (r) => r.category && r.category.includes(category),
//     );
//   }

//   //依關鍵字搜尋
//   if (keyword) {
//     filtered = filtered.filter((r) =>
//       r.name.toLowerCase().includes(keyword.toLowerCase()),
//     );
//   }

//   res.json(filtered);
// });

//取得所有/多間餐廳 firebase版
app.get("/restaurants", async (req, res) => {
  const { category, keyword } = req.query;

  //查詢
  const snapshot = await db.ref("restaurants").once("value");
  let filtered = snapshot.val() ? Object.values(snapshot.val()) : [];

  //依分類
  if (category) {
    filtered = filtered.filter(
      (r) => r.category && r.category.includes(category),
    );
  }

  //依關鍵字
  if (keyword) {
    filtered = filtered.filter((r) =>
      r.name.toLowerCase().includes(keyword.toLowerCase()),
    );
  }

  res.json(filtered);
});

//GET restaurants by id
// app.get("/restaurants/:id", (req, res) => {
//   const restaurant = data.restaurants.find((r) => r.id === req.params.id);

//   if (restaurant) {
//     res.json(restaurant);
//   } else {
//     res.status(404).json({ error: "餐廳不存在！" });
//   }
// });

//GET restaurants by id firebase版
app.get("/restaurants/:id", async (req, res) => {
  //單筆查詢
  const snapshot = await db.ref(`restaurants/${req.params.id}`).once("value");
  const restaurant = snapshot.val();

  if (restaurant) {
    res.json(restaurant);
  } else {
    res.status(404).json({ error: "餐廳不存在！" });
  }
});

//---------------------------------2. 訂位相關API------------------------------------------------

// 篩選訂位清單
// app.get("/reservations", (req, res) => {
//   const { userId } = req.query;

//   //如果有userId，就回傳該用戶的訂位
//   if (userId) {
//     const userReservation = data.reservations.filter(
//       (r) => r.userId === userId,
//     );
//     return res.json(userReservation);
//   }

//   //無userId則回傳全部
//   res.json(data.reservations);
// });

// 篩選訂位清單 firebase版
app.get("/reservations", async (req, res) => {
  const { userId } = req.query;

  //讀取全部訂位
  const snapshot = await db.ref("reservations").once("value");
  let filtered = snapshot.val() ? Object.values(snapshot.val()) : [];

  if (userId) {
    filtered = filtered.filter((r) => r.userId === userId);
  }

  res.json(filtered);
});

//新增訂位
// app.post("/reservations", (req, res) => {
//   // 把前端送來的資料解構出來
//   const {
//     userId,
//     restaurantId,
//     restaurantName,
//     date,
//     time,
//     dayOfWeek,
//     partySize,
//     customerName,
//     customerPhone,
//     customerEmail,
//     note,
//   } = req.body;

//   // 必填欄位
//   if (!restaurantId || !date || !time || !partySize) {
//     return res.status(400).json({ error: "請提供完整的訂位資訊" });
//   }

//   // 取得今天的日期
//   const today = new Date().toISOString().split("T")[0];

//   // 組合新訂位物件
//   const newReservation = {
//     bookingId: `B${Date.now()}`, // 動態產生 B 開頭的 ID
//     userId: userId || "guest",
//     restaurantId,
//     restaurantName,
//     date,
//     time,
//     dayOfWeek,
//     partySize,
//     customerName,
//     customerPhone,
//     customerEmail,
//     note: note || "",
//     status: "已預約",
//     createdAt: today,
//   };

//   //存進記憶體
//   data.reservations.push(newReservation);

//   //回傳訊息
//   res.status(201).json({
//     message: "訂位成功！",
//     reservation: newReservation,
//   });
// });

//新增訂位 firebase版
app.post("/reservations", async (req, res) => {
  const payload = req.body;

  if (
    !payload.restaurantId ||
    !payload.date ||
    !payload.time ||
    !payload.partySize
  ) {
    return res.status(400).json({ error: "請提供完整的訂位資訊" });
  }

  try {
    const newRef = db.ref("reservations").push();
    await newRef.set({
      ...payload,
      bookingId: newRef.key,
      status: "已預約",
      createdAt: new Date().toISOString().split("T")[0],
    });

    res.status(201).json({
      message: "訂位成功，資料已儲存到firebase",
      reservation: payload,
    });
  } catch (error) {
    res.status(500).json({
      error: "伺服器錯誤",
    });
  }
});

//取消單筆訂位
// app.delete("/reservations/:bookingId", (req, res) => {
//   const index = data.reservations.findIndex(
//     (r) => r.bookingId === req.params.bookingId,
//   );

//   if (index === -1) {
//     return res.status(404).json({ error: "找不到訂位資料！" });
//   }

//   //把狀態改成取消
//   data.reservations[index].status = "已取消";

//   res.json({
//     message: "訂位已取消",
//     reservation: data.reservations[index],
//   });
// });

//取消單筆訂位 firebase
app.delete("/reservations/:bookingId", async (req, res) => {
  try {
    await db.ref(`reservations/${req.params.bookingId}`).remove();

    res.json({
      message: "已永久刪除訂位資料",
    });
  } catch (error) {
    res.status(404).json({ error: "找不到訂位資料" });
  }
});

//---------------------------------3. 會員相關API------------------------------------------------

//取得所有會員 (admin)
// app.get("/members", (req, res) => {
//   //把passwordhash過濾掉
//   const safeMembers = data.members.map((member) => {
//     const { passwordHash, ...safeData } = member;
//     return safeData;
//   });

//   res.json(safeMembers);
// });

//取得所有會員 (admin) firebase
app.get("/members", async (req, res) => {
  const snapshot = await db.ref("members").once("value");
  const safeMembers = snapshot.val() ? Object.values(snapshot.val()) : [];

  res.json(safeMembers);
});

//取得單一會員資料
// app.get("/members/:userId", (req, res) => {
//   const member = data.members.find((m) => m.userId === req.params.userId);

//   if (member) {
//     const { passwordHash, ...safeData } = member;
//     res.json(safeData);
//   } else {
//     res.status(404).json({ error: "找不到該會員！" });
//   }
// });

//取得單一會員資料 firebase
app.get("/members/:userId", async (req, res) => {
  const snapshot = await db.ref(`members/${req.params.userId}`).once("value");
  const member = snapshot.val();

  if (member) {
    const { passwordHash, ...safeData } = member;
    res.json(safeData);
  } else {
    res.status(404).json({ error: "找不到該會員" });
  }
});

//收藏餐廳 (toggle)
// app.patch("/members/:userId/likes", (req, res) => {
//   const { restaurantId } = req.body;
//   const member = data.members.find((m) => m.userId === req.params.userId);

//   if (!member) {
//     return res.status(404).json({ error: "找不到該會員！" });
//   }
//   if (!restaurantId) {
//     return res.status(404).json({ error: "請提供餐廳 ID" });
//   }

//   //檢查是否已經收藏
//   const index = member.likedRestaurants.indexOf(restaurantId);

//   if (index === -1) {
//     //沒有收藏過 => 收藏
//     member.likedRestaurants.push(restaurantId);
//     res.json({
//       message: "已加入收藏",
//       likedRestaurants: member.likedRestaurants,
//     });
//   } else {
//     //已收藏 => 取消收藏
//     member.likedRestaurants.splice(index, 1);
//     res.json({
//       message: "已取消收藏",
//       likedRestaurants: member.likedRestaurants,
//     });
//   }
// });

//收藏餐廳 (toggle) firebase
app.patch("/members/:userId/likes", async (req, res) => {
  const { restaurantId } = req.body;

  //讀取會員
  const snapshot = await db.ref(`members/${req.params.userId}`).once("value");
  const member = snapshot.val();

  if (!member) {
    return res.status(404).json({ message: "找不到該會員" });
  }
  if (!restaurantId) {
    return res.status(404).json({ message: "請提供餐廳 ID" });
  }

  //現有收藏清單
  const likedRestaurants = member.likedRestaurants || [];
  const index = likedRestaurants.indexOf(restaurantId);

  let message, updatedList;

  if (index === -1) {
    //沒有收藏過=>收藏
    updatedList = [...likedRestaurants, restaurantId];
    message = "已加入收藏";
  } else {
    //已收藏 => 取消收藏
    updatedList = likedRestaurants.filter((id) => id !== restaurantId);
    message = "已取消收藏";
  }

  await db
    .ref(`members/${req.params.userId}/likedRestaurants`)
    .set(updatedList);

  res.json({
    message,
    likedRestaurants: updatedList,
  });
});

app.listen(process.env.PORT || 3001, "0.0.0.0", () => {
  console.log("Foodied API Running...");
});
