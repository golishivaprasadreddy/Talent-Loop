export const ROLES = {
  candidate: "candidate",
  recruiter: "recruiter",
  admin: "admin",
};

export const PERMISSIONS = {
  viewCandidateDashboard: "view:candidate-dashboard",
  viewRecruiterDashboard: "view:recruiter-dashboard",
  viewAdminDashboard: "view:admin-dashboard",
  manageOwnProfile: "manage:own-profile",
  manageOwnApplications: "manage:own-applications",
  saveJobs: "save:jobs",
  reviewCompanies: "review:companies",
  useCandidateAi: "use:candidate-ai",
  manageOwnJobs: "manage:own-jobs",
  manageApplicants: "manage:applicants",
  useRecruiterAi: "use:recruiter-ai",
  manageUsers: "manage:users",
  manageCompanies: "manage:companies",
  moderateJobs: "moderate:jobs",
  viewAdminReports: "view:admin-reports",
  useMessaging: "use:messaging",
  readNotifications: "read:notifications",
};

export const ROLE_PERMISSIONS = {
  [ROLES.candidate]: [
    PERMISSIONS.viewCandidateDashboard,
    PERMISSIONS.manageOwnProfile,
    PERMISSIONS.manageOwnApplications,
    PERMISSIONS.saveJobs,
    PERMISSIONS.reviewCompanies,
    PERMISSIONS.useCandidateAi,
    PERMISSIONS.useMessaging,
    PERMISSIONS.readNotifications,
  ],
  [ROLES.recruiter]: [
    PERMISSIONS.viewRecruiterDashboard,
    PERMISSIONS.manageOwnProfile,
    PERMISSIONS.manageOwnJobs,
    PERMISSIONS.manageApplicants,
    PERMISSIONS.useRecruiterAi,
    PERMISSIONS.useMessaging,
    PERMISSIONS.readNotifications,
  ],
  [ROLES.admin]: [
    PERMISSIONS.viewAdminDashboard,
    PERMISSIONS.manageOwnProfile,
    PERMISSIONS.manageUsers,
    PERMISSIONS.manageCompanies,
    PERMISSIONS.moderateJobs,
    PERMISSIONS.viewAdminReports,
    PERMISSIONS.manageApplicants,
    PERMISSIONS.useMessaging,
    PERMISSIONS.readNotifications,
  ],
};

export const ROUTE_PERMISSIONS = [
  { path: "/dashboard/candidate", permission: PERMISSIONS.viewCandidateDashboard },
  { path: "/dashboard/recruiter", permission: PERMISSIONS.viewRecruiterDashboard },
  { path: "/dashboard/admin", permission: PERMISSIONS.viewAdminDashboard },
  { path: "/dashboard", permission: PERMISSIONS.viewCandidateDashboard },
  { path: "/recruiter", permission: PERMISSIONS.viewRecruiterDashboard },
  { path: "/admin", permission: PERMISSIONS.viewAdminDashboard },
];

export function hasRole(role, allowedRoles = []) {
  return allowedRoles.includes(role);
}

export function can(role, permission) {
  return Boolean(role && ROLE_PERMISSIONS[role]?.includes(permission));
}

export function canAny(role, permissions = []) {
  return permissions.some((permission) => can(role, permission));
}

export function dashboardFor(role) {
  if (role === ROLES.admin) return "/dashboard/admin";
  if (role === ROLES.recruiter) return "/dashboard/recruiter";
  return "/dashboard/candidate";
}
