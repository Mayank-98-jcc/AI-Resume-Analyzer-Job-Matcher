const Resume = require("../models/Resume");
const User = require("../models/User");
const Activity = require("../models/Activity");
const Support = require("../models/Support");
const SupportMessage = require("../models/SupportMessage");
const ShortlistedCandidate = require("../models/ShortlistedCandidate");
const fs = require("fs");
const path = require("path");

const roleKeywords = {
  backend: ["backend", "node", "node.js", "express", "mongodb", "sql", "api", "server"],
  frontend: ["frontend", "front-end", "react", "javascript", "typescript", "css", "html", "ui"],
  data_analyst: ["data analyst", "analytics", "sql", "python", "power bi", "tableau", "excel", "statistics"],
  marketing: ["marketing", "seo", "sem", "branding", "campaign", "social media", "content", "growth"],
  hr: ["hr", "human resources", "recruitment", "talent acquisition", "onboarding", "payroll", "employee relations"]
};

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeRole(role = "") {
  return String(role).trim().toLowerCase().replace(/\s+/g, "_");
}

function toObjectIdString(value) {
  return value ? String(value) : "";
}

exports.getAllUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);
    const q = String(req.query.q || "").trim();
    const plan = String(req.query.plan || "").trim().toLowerCase();
    const sortByRaw = String(req.query.sortBy || "createdAt").trim();
    const sortDirRaw = String(req.query.sortDir || "desc").trim().toLowerCase();

    const allowedSort = new Set(["createdAt", "name", "email", "plan"]);
    const sortBy = allowedSort.has(sortByRaw) ? sortByRaw : "createdAt";
    const sortDir = sortDirRaw === "asc" ? 1 : -1;

    const filter = { role: { $ne: "admin" } };

    if (q) {
      const qRegex = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ email: qRegex }, { name: qRegex }];
    }

    if (plan && plan !== "all") {
      filter.plan = plan;
    }

    const skip = (page - 1) * limit;
    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("-password")
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(limit)
    ]);

    const totalPages = Math.max(Math.ceil(total / limit), 1);

    return res.json({
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch users",
      error: error.message
    });
  }
};

exports.getAllResumes = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const q = String(req.query.q || "").trim();
    const sortByRaw = String(req.query.sortBy || "uploadedAt").trim();
    const sortDirRaw = String(req.query.sortDir || "desc").trim().toLowerCase();

    const allowedSort = new Set(["uploadedAt", "atsScore", "fileName"]);
    const sortBy = allowedSort.has(sortByRaw) ? sortByRaw : "uploadedAt";
    const sortDir = sortDirRaw === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const resumeFilter = {};

    if (q) {
      const qRegex = new RegExp(escapeRegex(q), "i");
      const matchingUsers = await User.find(
        {
          role: { $ne: "admin" },
          $or: [{ name: qRegex }, { email: qRegex }]
        },
        "_id"
      ).lean();

      const matchingUserIds = matchingUsers.map((user) => user._id);

      resumeFilter.$or = [
        { fileName: qRegex },
        { skills: { $elemMatch: { $regex: qRegex } } }
      ];

      if (matchingUserIds.length) {
        resumeFilter.$or.push({ userId: { $in: matchingUserIds } });
      }
    }

    const [total, resumes] = await Promise.all([
      Resume.countDocuments(resumeFilter),
      Resume.find(resumeFilter)
        .populate("userId", "name email")
        .sort({ [sortBy]: sortDir, uploadedAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    const formattedResumes = resumes.map((resume) => ({
      _id: resume._id,
      userId: resume.userId?._id || null,
      userName: resume.userId?.name || "Unknown User",
      userEmail: resume.userId?.email || "",
      fileName: resume.fileName || "Untitled Resume",
      fileStorageName: resume.fileStorageName || null,
      fileMime: resume.fileMime || null,
      fileSize: resume.fileSize ?? null,
      atsScore: resume.atsScore ?? 0,
      skills: resume.skills || [],
      uploadedAt: resume.uploadedAt
    }));

    const totalPages = Math.max(Math.ceil(total / limit), 1);

    return res.json({
      data: formattedResumes,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch resumes",
      error: error.message
    });
  }
};

exports.getAdminResumeFile = async (req, res) => {
  try {
    const resumeId = req.params.id;
    if (!resumeId) {
      return res.status(400).json({ message: "resume id is required" });
    }

    const resume = await Resume.findById(resumeId).populate("userId", "name email");
    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    const uploadsDir = path.join(process.cwd(), "uploads");
    let storageName = String(resume.fileStorageName || "").trim();

    if (!storageName) {
      const originalName = String(resume.fileName || "").trim();
      if (!originalName) {
        return res.status(404).json({ message: "Resume file not available" });
      }

      // Best-effort fallback for older resume records where `fileStorageName` wasn't stored.
      // Multer storage uses `${Date.now()}-${originalName}` so we search for files ending in `-${originalName}`.
      let candidate = null;
      try {
        const suffix = `-${originalName}`;
        const files = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
        const matches = files.filter((name) => name.endsWith(suffix));
        if (matches.length) {
          const ranked = matches
            .map((name) => {
              const full = path.join(uploadsDir, name);
              try {
                const stat = fs.statSync(full);
                return { name, mtimeMs: stat.mtimeMs || 0 };
              } catch {
                return { name, mtimeMs: 0 };
              }
            })
            .sort((a, b) => b.mtimeMs - a.mtimeMs);
          candidate = ranked[0]?.name || null;
        }
      } catch {
        candidate = null;
      }

      if (!candidate) {
        return res.status(404).json({
          message:
            "Resume file not available. If this resume was uploaded before file storage was enabled, please re-upload it."
        });
      }

      storageName = candidate;
      // Opportunistically backfill so next request doesn't need directory scan.
      resume.fileStorageName = candidate;
      if (!resume.fileMime) {
        const lower = String(originalName).toLowerCase();
        if (lower.endsWith(".pdf")) resume.fileMime = "application/pdf";
        if (lower.endsWith(".docx")) {
          resume.fileMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }
      }
      await resume.save().catch(() => null);
    }

    const safeName = path.basename(storageName);
    const filePath = path.join(uploadsDir, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Resume file not found on disk" });
    }

    const downloadName = resume.fileName || safeName;
    const lowerName = String(downloadName).toLowerCase();
    const inferredMime = lowerName.endsWith(".pdf")
      ? "application/pdf"
      : lowerName.endsWith(".docx")
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/octet-stream";
    const mime = resume.fileMime || inferredMime;
    const dispositionType = mime === "application/pdf" ? "inline" : "attachment";

    res.setHeader("Content-Type", mime);
    res.setHeader(
      "Content-Disposition",
      `${dispositionType}; filename="${String(downloadName).replace(/"/g, "")}"`
    );

    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch resume file",
      error: error.message
    });
  }
};

exports.getAdminStats = async (req, res) => {
  try {
    const nonAdminFilter = { role: { $ne: "admin" } };
    const freePlanFilter = {
      ...nonAdminFilter,
      $or: [
        { plan: "free" },
        { plan: null },
        { plan: "" },
        { plan: { $exists: false } }
      ]
    };
    const [totalUsers, freeUsers, proUsers, premiumUsers, totalResumes] = await Promise.all([
      User.countDocuments(nonAdminFilter),
      User.countDocuments(freePlanFilter),
      User.countDocuments({ ...nonAdminFilter, plan: "pro" }),
      User.countDocuments({ ...nonAdminFilter, plan: "premium" }),
      Resume.countDocuments({})
    ]);

    return res.json({
      totalUsers,
      freeUsers,
      proUsers,
      premiumUsers,
      totalResumes
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch admin stats",
      error: error.message
    });
  }
};

exports.filterResumesByRole = async (req, res) => {
  try {
    const normalizedRole = normalizeRole(req.query.role);

    if (!normalizedRole) {
      return res.status(400).json({
        message: "role query is required"
      });
    }

    const keywords = roleKeywords[normalizedRole] || [normalizedRole.replace(/_/g, " ")];
    const regexes = keywords.map((keyword) => new RegExp(escapeRegex(keyword), "i"));

    const resumes = await Resume.find({
      skills: {
        $elemMatch: {
          $in: regexes
        }
      }
    })
      .populate("userId", "name email plan")
      .sort({ uploadedAt: -1 });

    const matches = resumes.map((resume) => ({
      _id: resume._id,
      userId: resume.userId?._id || null,
      userName: resume.userId?.name || "Unknown User",
      userEmail: resume.userId?.email || "",
      plan: resume.userId?.plan || "free",
      fileName: resume.fileName || "Untitled Resume",
      atsScore: resume.atsScore ?? 0,
      skills: resume.skills || [],
      uploadedAt: resume.uploadedAt
    }));

    return res.json(matches);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to filter resumes",
      error: error.message
    });
  }
};

exports.getAdminAnalytics = async (req, res) => {
  try {
    const requestedDays = parseInt(req.query.days, 10);
    const days = Math.min(Math.max(Number.isFinite(requestedDays) ? requestedDays : 30, 7), 365);

    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);

    const startDate = new Date(todayUtc);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));

    const endDate = new Date(todayUtc);
    endDate.setUTCDate(endDate.getUTCDate() + 1);

    const dateKeys = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      dateKeys.push(d.toISOString().slice(0, 10));
    }

    const nonAdminFilter = { role: { $ne: "admin" } };

    const [baseUsersBeforeWindow, usersByDay, resumesByDay, planCounts] = await Promise.all([
      User.countDocuments({ ...nonAdminFilter, createdAt: { $lt: startDate } }),
      User.aggregate([
        { $match: { ...nonAdminFilter, createdAt: { $gte: startDate, $lt: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Resume.aggregate([
        { $match: { uploadedAt: { $gte: startDate, $lt: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$uploadedAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      User.aggregate([
        { $match: nonAdminFilter },
        { $group: { _id: { $ifNull: ["$plan", "free"] }, count: { $sum: 1 } } }
      ])
    ]);

    const usersCountMap = usersByDay.reduce((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});

    const resumeCountMap = resumesByDay.reduce((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});

    let runningUsers = 0;
    const userGrowth = dateKeys.map((date) => {
      runningUsers += usersCountMap[date] || 0;
      return { date, users: baseUsersBeforeWindow + runningUsers };
    });

    const resumeUploads = dateKeys.map((date) => ({
      date,
      uploads: resumeCountMap[date] || 0
    }));

    const plans = planCounts.reduce(
      (acc, row) => {
        const key = String(row._id || "").toLowerCase();
        if (key === "pro" || key === "premium" || key === "free") acc[key] = row.count || 0;
        return acc;
      },
      { free: 0, pro: 0, premium: 0 }
    );

    return res.json({
      userGrowth,
      resumeUploads,
      plans
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch admin analytics",
      error: error.message
    });
  }
};

exports.getAdminActivity = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

    const activity = await Activity.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "name email");

    const formatted = activity.map((item) => ({
      _id: item._id,
      type: item.type,
      description: item.description,
      createdAt: item.createdAt,
      user: item.user
        ? { _id: item.user._id, name: item.user.name, email: item.user.email }
        : null
    }));

    return res.json(formatted);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch admin activity",
      error: error.message
    });
  }
};

exports.getAllFeedback = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const unreadOnly = String(req.query.unreadOnly || "").trim().toLowerCase() === "true";
    const filter = unreadOnly ? { isRead: false } : {};

    const [feedback, unreadCount] = await Promise.all([
      Support.find(filter)
        .sort({ lastMessageAt: -1 })
        .limit(limit)
        .populate("userId", "name email"),
      Support.countDocuments({ isRead: false })
    ]);

    const latestMessages = await SupportMessage.find({
      sessionId: { $in: feedback.map((item) => item._id) },
      sender: "user"
    })
      .sort({ createdAt: -1 })
      .select("sessionId message createdAt");

    const latestMessageBySession = new Map();
    latestMessages.forEach((item) => {
      const key = toObjectIdString(item.sessionId);
      if (!latestMessageBySession.has(key)) {
        latestMessageBySession.set(key, item);
      }
    });

    return res.json({
      data: feedback.map((item) => ({
        _id: item._id,
        userId: item.userId?._id || null,
        userName: item.userId?.name || "",
        email: item.email || item.userId?.email || "",
        category: item.category,
        message: latestMessageBySession.get(toObjectIdString(item._id))?.message || item.lastMessage || "",
        isRead: Boolean(item.isRead),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        lastMessageAt: item.lastMessageAt
      })),
      meta: {
        unreadCount
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch feedback",
      error: error.message
    });
  }
};

exports.markFeedbackAsRead = async (req, res) => {
  try {
    await Support.updateMany({ isRead: false }, { $set: { isRead: true } });

    return res.json({
      message: "Feedback marked as read"
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update feedback status",
      error: error.message
    });
  }
};

exports.getShortlistedCandidates = async (req, res) => {
  try {
    const shortlist = await ShortlistedCandidate.find({ adminId: req.user._id })
      .select("resumeId userId createdAt")
      .sort({ createdAt: -1 });

    return res.json({
      shortlistedResumeIds: shortlist.map((entry) => toObjectIdString(entry.resumeId)),
      shortlistedUserIds: shortlist.map((entry) => toObjectIdString(entry.userId)),
      items: shortlist.map((entry) => ({
        _id: entry._id,
        resumeId: toObjectIdString(entry.resumeId),
        userId: toObjectIdString(entry.userId),
        createdAt: entry.createdAt
      }))
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load shortlisted candidates",
      error: error.message
    });
  }
};

exports.addShortlistedCandidate = async (req, res) => {
  try {
    const resumeId = String(req.body?.resumeId || "").trim();

    if (!resumeId) {
      return res.status(400).json({ message: "resumeId is required" });
    }

    const resume = await Resume.findById(resumeId).select("_id userId");
    if (!resume) {
      return res.status(404).json({ message: "Candidate resume not found" });
    }

    const shortlist = await ShortlistedCandidate.findOneAndUpdate(
      { adminId: req.user._id, resumeId: resume._id },
      {
        adminId: req.user._id,
        userId: resume.userId,
        resumeId: resume._id
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    return res.json({
      message: "Candidate shortlisted successfully",
      item: {
        _id: shortlist._id,
        resumeId: toObjectIdString(shortlist.resumeId),
        userId: toObjectIdString(shortlist.userId),
        createdAt: shortlist.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to shortlist candidate",
      error: error.message
    });
  }
};

exports.removeShortlistedCandidate = async (req, res) => {
  try {
    const resumeId = String(req.params.resumeId || "").trim();

    if (!resumeId) {
      return res.status(400).json({ message: "resumeId is required" });
    }

    await ShortlistedCandidate.deleteOne({
      adminId: req.user._id,
      resumeId
    });

    return res.json({
      message: "Candidate removed from shortlist"
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to remove shortlisted candidate",
      error: error.message
    });
  }
};
