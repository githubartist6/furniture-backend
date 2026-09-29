const Order = require("../models/Order");

// =====================================
// ALLOWED ORDER STATUSES
// =====================================

const ALLOWED_STATUSES = [
    "Order Placed",
    "Confirmed",
    "Processing",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
];

// =====================================
// GET TODAY RANGE
// =====================================

const getTodayRange = () => {
    const now = new Date();

    const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

    const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
    );

    return {
        start,
        end,
    };
};

// =====================================
// GET YESTERDAY RANGE
// =====================================

const getYesterdayRange = () => {
    const now = new Date();

    const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1
    );

    const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

    return {
        start,
        end,
    };
};

// =====================================
// GET LAST N DAYS RANGE
// Includes today
// =====================================

const getLastNDaysRange = (days) => {
    const now = new Date();

    const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
    );

    const start = new Date(end);

    start.setDate(start.getDate() - days);

    return {
        start,
        end,
    };
};

// =====================================
// GET LAST N MONTHS RANGE
// Includes current month
// =====================================

const getLastNMonthsRange = (months) => {
    const now = new Date();

    // First day of NEXT month
    const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
    );

    // IMPORTANT:
    // For 2 months:
    // current month + previous month
    // Example: September + August
    const start = new Date(
        now.getFullYear(),
        now.getMonth() - months + 1,
        1
    );

    return {
        start,
        end,
    };
};

// =====================================
// FORMAT LOCAL DATE
// =====================================

const formatLocalDate = (date) => {
    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}-${String(
        date.getDate()
    ).padStart(2, "0")}`;
};

// =====================================
// FORMAT LOCAL MONTH
// =====================================

const formatLocalMonth = (date) => {
    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}`;
};

// =====================================
// GET DASHBOARD RANGE CONFIG
// =====================================

const getDashboardRange = (range) => {
    switch (range) {
        case "today": {
            const { start, end } = getTodayRange();

            return {
                type: "single-day",
                start,
                end,
                label: "Orders received today",
            };
        }

        case "yesterday": {
            const { start, end } =
                getYesterdayRange();

            return {
                type: "single-day",
                start,
                end,
                label: "Orders received yesterday",
            };
        }

        case "7days": {
            const { start, end } =
                getLastNDaysRange(7);

            return {
                type: "days",
                count: 7,
                start,
                end,
                label: "Orders received in the last 7 days",
            };
        }

        case "30days": {
            const { start, end } =
                getLastNDaysRange(30);

            return {
                type: "days",
                count: 30,
                start,
                end,
                label: "Orders received in the last 30 days",
            };
        }

        case "2months": {
            const { start, end } =
                getLastNMonthsRange(2);

            return {
                type: "months",
                count: 2,
                start,
                end,
                label: "Orders received in the last 2 months",
            };
        }

        case "6months": {
            const { start, end } =
                getLastNMonthsRange(6);

            return {
                type: "months",
                count: 6,
                start,
                end,
                label: "Orders received in the last 6 months",
            };
        }

        case "1year": {
            const { start, end } =
                getLastNMonthsRange(12);

            return {
                type: "months",
                count: 12,
                start,
                end,
                label: "Orders received in the last 1 year",
            };
        }

        case "2years": {
            const { start, end } =
                getLastNMonthsRange(24);

            return {
                type: "months",
                count: 24,
                start,
                end,
                label: "Orders received in the last 2 years",
            };
        }

        case "3years": {
            const { start, end } =
                getLastNMonthsRange(36);

            return {
                type: "months",
                count: 36,
                start,
                end,
                label: "Orders received in the last 3 years",
            };
        }

        case "4years": {
            const { start, end } =
                getLastNMonthsRange(48);

            return {
                type: "months",
                count: 48,
                start,
                end,
                label: "Orders received in the last 4 years",
            };
        }

        case "5years": {
            const { start, end } =
                getLastNMonthsRange(60);

            return {
                type: "months",
                count: 60,
                start,
                end,
                label: "Orders received in the last 5 years",
            };
        }

        default: {
            const { start, end } =
                getLastNDaysRange(7);

            return {
                type: "days",
                count: 7,
                start,
                end,
                label: "Orders received in the last 7 days",
            };
        }
    }
};

// =====================================
// GET ADMIN DASHBOARD
// =====================================

const getAdminDashboard = async (req, res) => {
    try {
        // =================================
        // AUTH CHECK
        // =================================

        const userId =
            req.user?._id || req.user?.id;

        if (!userId) {
            console.error(
                "[ADMIN DASHBOARD AUTH ERROR] Admin user ID is missing"
            );

            return res.status(401).json({
                message:
                    "Authentication required. Please login again.",
            });
        }

        // =================================
        // TODAY RANGE
        // =================================

        const {
            start: todayStart,
            end: todayEnd,
        } = getTodayRange();

        // =================================
        // DASHBOARD GRAPH RANGE
        // =================================

        const selectedRange =
            req.query.range || "7days";

        const rangeConfig =
            getDashboardRange(selectedRange);

        // =================================
        // BASIC ORDER COUNTS
        // =================================

        const [
            totalOrders,
            todayOrders,
            pendingOrders,
            confirmedOrders,
            processingOrders,
            outForDeliveryOrders,
            deliveredOrders,
            cancelledOrders,
        ] = await Promise.all([
            Order.countDocuments(),

            Order.countDocuments({
                orderDate: {
                    $gte: todayStart,
                    $lt: todayEnd,
                },
            }),

            Order.countDocuments({
                status: "Order Placed",
            }),

            Order.countDocuments({
                status: "Confirmed",
            }),

            Order.countDocuments({
                status: "Processing",
            }),

            Order.countDocuments({
                status: "Out for Delivery",
            }),

            Order.countDocuments({
                status: "Delivered",
            }),

            Order.countDocuments({
                status: "Cancelled",
            }),
        ]);

        // =================================
        // UPCOMING ORDERS
        // =================================

        const upcomingOrders =
            confirmedOrders +
            processingOrders +
            outForDeliveryOrders;

        // =================================
        // TOTAL REVENUE
        // Cancelled orders excluded
        // =================================

        const revenueResult =
            await Order.aggregate([
                {
                    $match: {
                        status: {
                            $ne: "Cancelled",
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: {
                            $sum: {
                                $ifNull: [
                                    "$total",
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]);

        const totalRevenue =
            revenueResult.length > 0
                ? revenueResult[0].totalRevenue
                : 0;

        // =================================
        // TODAY REVENUE
        // Cancelled orders excluded
        // =================================

        const todayRevenueResult =
            await Order.aggregate([
                {
                    $match: {
                        orderDate: {
                            $gte: todayStart,
                            $lt: todayEnd,
                        },
                        status: {
                            $ne: "Cancelled",
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        todayRevenue: {
                            $sum: {
                                $ifNull: [
                                    "$total",
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]);

        const todayRevenue =
            todayRevenueResult.length > 0
                ? todayRevenueResult[0]
                    .todayRevenue
                : 0;

        // =================================
        // TODAY'S ORDERS
        // =================================

        const todaysOrders =
            await Order.find({
                orderDate: {
                    $gte: todayStart,
                    $lt: todayEnd,
                },
            })
                .populate(
                    "userId",
                    "name username email"
                )
                .sort({
                    orderDate: -1,
                })
                .limit(20);

        // =================================
        // GRAPH DATA
        // =================================

        let orderOverview = [];

        // =================================
        // SINGLE DAY
        // TODAY / YESTERDAY
        // =================================

        if (
            rangeConfig.type ===
            "single-day"
        ) {
            const graphData =
                await Order.aggregate([
                    {
                        $match: {
                            orderDate: {
                                $gte:
                                    rangeConfig.start,
                                $lt:
                                    rangeConfig.end,
                            },
                            status: {
                                $ne: "Cancelled",
                            },
                        },
                    },
                    {
                        $group: {
                            _id: null,

                            orders: {
                                $sum: 1,
                            },

                            revenue: {
                                $sum: {
                                    $ifNull: [
                                        "$total",
                                        0,
                                    ],
                                },
                            },
                        },
                    },
                ]);

            const orders =
                graphData.length > 0
                    ? graphData[0].orders
                    : 0;

            const revenue =
                graphData.length > 0
                    ? graphData[0].revenue
                    : 0;

            const isToday =
                selectedRange === "today";

            orderOverview = [
                {
                    date: formatLocalDate(
                        rangeConfig.start
                    ),

                    day: isToday
                        ? "Today"
                        : "Yesterday",

                    orders,
                    revenue,
                },
            ];
        }

        // =================================
        // DAILY DATA
        // 7 DAYS / 30 DAYS
        // =================================

        else if (
            rangeConfig.type ===
            "days"
        ) {
            const dailyData =
                await Order.aggregate([
                    {
                        $match: {
                            orderDate: {
                                $gte:
                                    rangeConfig.start,
                                $lt:
                                    rangeConfig.end,
                            },
                            status: {
                                $ne: "Cancelled",
                            },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format:
                                        "%Y-%m-%d",
                                    date:
                                        "$orderDate",
                                },
                            },

                            orders: {
                                $sum: 1,
                            },

                            revenue: {
                                $sum: {
                                    $ifNull: [
                                        "$total",
                                        0,
                                    ],
                                },
                            },
                        },
                    },
                    {
                        $sort: {
                            _id: 1,
                        },
                    },
                ]);

            // =================================
            // CREATE EVERY DAY
            // INCLUDING ZERO ORDER DAYS
            // =================================

            for (
                let i =
                    rangeConfig.count - 1;
                i >= 0;
                i--
            ) {
                const date = new Date();

                date.setHours(
                    0,
                    0,
                    0,
                    0
                );

                date.setDate(
                    date.getDate() - i
                );

                const dateString =
                    formatLocalDate(date);

                const existingDay =
                    dailyData.find(
                        (item) =>
                            item._id ===
                            dateString
                    );

                let dayLabel =
                    date.toLocaleDateString(
                        "en-IN",
                        {
                            weekday:
                                "short",
                        }
                    );

                // 30 days → date + month
                if (
                    rangeConfig.count ===
                    30
                ) {
                    dayLabel =
                        date.toLocaleDateString(
                            "en-IN",
                            {
                                day: "2-digit",
                                month: "short",
                            }
                        );
                }

                orderOverview.push({
                    date:
                        dateString,

                    day:
                        dayLabel,

                    orders:
                        existingDay?.orders ??
                        0,

                    revenue:
                        existingDay?.revenue ??
                        0,
                });
            }
        }

        // =================================
        // MONTHLY DATA
        // =================================

        else if (
            rangeConfig.type ===
            "months"
        ) {
            const monthlyData =
                await Order.aggregate([
                    {
                        $match: {
                            orderDate: {
                                $gte:
                                    rangeConfig.start,
                                $lt:
                                    rangeConfig.end,
                            },
                            status: {
                                $ne: "Cancelled",
                            },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format:
                                        "%Y-%m",
                                    date:
                                        "$orderDate",
                                },
                            },

                            orders: {
                                $sum: 1,
                            },

                            revenue: {
                                $sum: {
                                    $ifNull: [
                                        "$total",
                                        0,
                                    ],
                                },
                            },
                        },
                    },
                    {
                        $sort: {
                            _id: 1,
                        },
                    },
                ]);

            // =================================
            // CREATE EVERY MONTH
            // INCLUDING ZERO ORDER MONTHS
            // =================================

            for (
                let i =
                    rangeConfig.count - 1;
                i >= 0;
                i--
            ) {
                const date =
                    new Date(
                        rangeConfig.end
                    );

                date.setDate(1);

                date.setMonth(
                    date.getMonth() -
                    i -
                    1
                );

                const monthString =
                    formatLocalMonth(date);

                const existingMonth =
                    monthlyData.find(
                        (item) =>
                            item._id ===
                            monthString
                    );

                const monthLabel =
                    date.toLocaleDateString(
                        "en-IN",
                        {
                            month: "short",
                            year: "numeric",
                        }
                    );

                orderOverview.push({
                    date:
                        monthString,

                    day:
                        monthLabel,

                    orders:
                        existingMonth?.orders ??
                        0,

                    revenue:
                        existingMonth?.revenue ??
                        0,
                });
            }
        }

        // =================================
        // RESPONSE
        // =================================

        return res.status(200).json({
            admin: {
                id: req.user?._id,
                username:
                    req.user?.username,
                name: req.user?.name,
                email: req.user?.email,
                isAdmin:
                    req.user?.isAdmin,
            },

            stats: {
                totalOrders,
                todayOrders,
                pendingOrders,
                confirmedOrders,
                processingOrders,
                outForDeliveryOrders,
                deliveredOrders,
                cancelledOrders,
                upcomingOrders,
                totalRevenue,
                todayRevenue,
            },

            overviewRange:
                selectedRange,

            overviewLabel:
                rangeConfig.label,

            orderOverview,

            todaysOrders,
        });
    } catch (error) {
        // =================================
        // TECHNICAL ERROR → CONSOLE ONLY
        // =================================

        console.error(
            "[ADMIN DASHBOARD DATABASE/SERVER ERROR]",
            {
                message: error.message,
                name: error.name,
                stack: error.stack,
            }
        );

        // =================================
        // USER MESSAGE → TOASTIFY
        // =================================

        return res.status(500).json({
            message:
                "Unable to load dashboard. Please try again.",
        });
    }
};

// =====================================
// GET ALL ORDERS
// =====================================

const getAllOrders = async (req, res) => {
    try {
        const {
            search = "",
            status = "",
            today = "",
        } = req.query;

        const query = {};

        // =================================
        // SEARCH BY ORDER ID
        // =================================

        if (
            typeof search === "string" &&
            search.trim()
        ) {
            query.orderId = {
                $regex: search.trim(),
                $options: "i",
            };
        }

        // =================================
        // FILTER BY STATUS
        // =================================

        if (
            typeof status === "string" &&
            status &&
            status !== "All"
        ) {
            if (
                !ALLOWED_STATUSES.includes(
                    status
                )
            ) {
                return res.status(400).json({
                    message:
                        "Invalid order status filter.",
                });
            }

            query.status = status;
        }

        // =================================
        // TODAY FILTER
        // =================================

        if (today === "true") {
            const {
                start,
                end,
            } = getTodayRange();

            query.orderDate = {
                $gte: start,
                $lt: end,
            };
        }

        const orders =
            await Order.find(query)
                .populate(
                    "userId",
                    "name username email"
                )
                .sort({
                    orderDate: -1,
                });

        return res.status(200).json({
            count: orders.length,
            orders,
        });
    } catch (error) {
        // Technical error → console ONLY
        console.error(
            "[GET ALL ORDERS DATABASE ERROR]",
            {
                message: error.message,
                name: error.name,
                stack: error.stack,
            }
        );

        // Toastify message
        return res.status(500).json({
            message:
                "Unable to fetch orders. Please try again.",
        });
    }
};

// =====================================
// GET SINGLE ORDER
// =====================================

const getSingleOrder = async (
    req,
    res
) => {
    try {
        const order =
            await Order.findOne({
                orderId:
                    req.params.orderId,
            }).populate(
                "userId",
                "name username email"
            );

        if (!order) {
            return res.status(404).json({
                message:
                    "Order not found.",
            });
        }

        return res.status(200).json({
            order,
        });
    } catch (error) {
        // Technical error → console ONLY
        console.error(
            "[GET SINGLE ORDER DATABASE ERROR]",
            {
                message: error.message,
                name: error.name,
                stack: error.stack,
            }
        );

        // Toastify message
        return res.status(500).json({
            message:
                "Unable to fetch order. Please try again.",
        });
    }
};

// =====================================
// UPDATE ORDER STATUS
// =====================================

const updateOrderStatus = async (
    req,
    res
) => {
    try {
        const { status } = req.body;

        // =================================
        // VALIDATE STATUS
        // =================================

        if (
            typeof status !== "string" ||
            !ALLOWED_STATUSES.includes(
                status
            )
        ) {
            return res.status(400).json({
                message:
                    "Please select a valid order status.",
            });
        }

        // =================================
        // FIND ORDER
        // =================================

        const order =
            await Order.findOne({
                orderId:
                    req.params.orderId,
            });

        if (!order) {
            return res.status(404).json({
                message:
                    "Order not found.",
            });
        }

        // =================================
        // UPDATE STATUS
        // =================================

        order.status = status;

        // =================================
        // DELIVERY DATE
        // =================================

        if (
            status ===
            "Delivered"
        ) {
            order.deliveryDate =
                new Date();
        } else {
            // Remove old delivery date if
            // order moves back from Delivered
            order.deliveryDate = null;
        }

        await order.save();

        return res.status(200).json({
            message:
                "Order status updated successfully.",
            order,
        });
    } catch (error) {
        // Technical error → console ONLY
        console.error(
            "[UPDATE ORDER STATUS DATABASE ERROR]",
            {
                message: error.message,
                name: error.name,
                stack: error.stack,
            }
        );

        // Toastify message
        return res.status(500).json({
            message:
                "Unable to update order status. Please try again.",
        });
    }
};

// =====================================
// GET TODAY'S ORDERS
// =====================================

const getTodaysOrders = async (
    req,
    res
) => {
    try {
        const {
            start,
            end,
        } = getTodayRange();

        const orders =
            await Order.find({
                orderDate: {
                    $gte: start,
                    $lt: end,
                },
            })
                .populate(
                    "userId",
                    "name username email"
                )
                .sort({
                    orderDate: -1,
                });

        return res.status(200).json({
            count: orders.length,
            orders,
        });
    } catch (error) {
        // Technical error → console ONLY
        console.error(
            "[TODAY ORDERS DATABASE ERROR]",
            {
                message: error.message,
                name: error.name,
                stack: error.stack,
            }
        );

        // Toastify message
        return res.status(500).json({
            message:
                "Unable to fetch today's orders. Please try again.",
        });
    }
};

// =====================================
// GET ORDER STATS
// =====================================

const getOrderStats = async (
    req,
    res
) => {
    try {
        const result =
            await Order.aggregate([
                {
                    $group: {
                        _id: "$status",

                        count: {
                            $sum: 1,
                        },
                    },
                },
            ]);

        const stats = {
            "Order Placed": 0,
            Confirmed: 0,
            Processing: 0,
            "Out for Delivery": 0,
            Delivered: 0,
            Cancelled: 0,
        };

        result.forEach((item) => {
            if (
                Object.prototype.hasOwnProperty.call(
                    stats,
                    item._id
                )
            ) {
                stats[item._id] =
                    item.count;
            }
        });

        return res.status(200).json({
            stats,
        });
    } catch (error) {
        // Technical error → console ONLY
        console.error(
            "[ORDER STATS DATABASE ERROR]",
            {
                message: error.message,
                name: error.name,
                stack: error.stack,
            }
        );

        // Toastify message
        return res.status(500).json({
            message:
                "Unable to load order statistics. Please try again.",
        });
    }
};

// =====================================
// EXPORTS
// =====================================

module.exports = {
    getAdminDashboard,
    getAllOrders,
    getSingleOrder,
    updateOrderStatus,
    getTodaysOrders,
    getOrderStats,
};