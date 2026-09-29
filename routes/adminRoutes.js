const express = require("express");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  getAdminDashboard,
  getAllOrders,
  getSingleOrder,
  updateOrderStatus,
  getTodaysOrders,
  getOrderStats,
} = require("../controllers/adminController");

const router = express.Router();


// =====================================
// ADMIN DASHBOARD
// GET /api/admin/dashboard
// =====================================

router.get(
  "/dashboard",
  protect,
  adminOnly,
  getAdminDashboard
);


// =====================================
// ORDER STATISTICS
// GET /api/admin/orders/stats
// =====================================

router.get(
  "/orders/stats",
  protect,
  adminOnly,
  getOrderStats
);


// =====================================
// TODAY'S ORDERS
// GET /api/admin/orders/today
// =====================================

router.get(
  "/orders/today",
  protect,
  adminOnly,
  getTodaysOrders
);


// =====================================
// ALL ORDERS
// GET /api/admin/orders
// =====================================

router.get(
  "/orders",
  protect,
  adminOnly,
  getAllOrders
);


// =====================================
// SINGLE ORDER
// GET /api/admin/orders/:orderId
// =====================================

router.get(
  "/orders/:orderId",
  protect,
  adminOnly,
  getSingleOrder
);


// =====================================
// UPDATE ORDER STATUS
// PATCH /api/admin/orders/:orderId/status
// =====================================

router.patch(
  "/orders/:orderId/status",
  protect,
  adminOnly,
  updateOrderStatus
);


module.exports = router;