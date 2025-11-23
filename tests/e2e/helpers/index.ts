/**
 * Central export file for all E2E test helpers
 * Import helpers from this file for cleaner imports:
 *
 * @example
 * import { loginAsUser, createWish, goToWishes } from './helpers';
 */

// Auth helpers
export {
  loginAsUser,
  createAndLoginUser,
  createTestUsers,
  logout,
  isLoggedIn,
  getSessionToken,
  waitForAuth,
  type TestUser,
} from './auth.helper';

// Database helpers
export {
  // Preferred function names
  createWish,
  createList,
  createGroup,
  // Legacy function names (deprecated)
  createTestWish,
  createTestList,
  createTestGroup,
  // Utility functions
  addWishToList,
  addUserToGroup,
  shareListWithGroup,
  createCompleteTestScenario,
  seedTestData,
  cleanupTestData,
  resetDatabase,
  cleanupReservation,
  getReservationByWishId,
  countReservationsForWish,
  createReservation,
  getUserWishes,
  getUserLists,
  getUserGroups,
  getDatabaseCounts,
  // Group invitation helpers
  createGroupInvitation,
  getPendingInvitations,
  isGroupMember,
  getGroup,
  getList,
} from './database.helper';

// Email helpers
export {
  generateUniqueEmail,
  generateUniqueEmails,
} from './email.helper';

// Reservation helpers
export {
  getMagicLink,
  loginWithMagicLink,
  seedReservation,
  createPublicListWithWishes,
} from './reservation.helper';

// Navigation helpers
export {
  goToWishes,
  goToLists,
  goToListDetail,
  goToGroups,
  goToGroupDetail,
  goToProfile,
  goToSettings,
  goToAdmin,
  goToHome,
  goToLogin,
  goToSharedList,
  waitForPageLoad,
  waitForToast,
  waitForElement,
  waitForElementToDisappear,
  waitForLoadingComplete,
  clickAndNavigate,
  fillAndWait,
  scrollToElement,
  getCurrentPath,
  isOnPage,
  waitForApiResponse,
  takeScreenshot,
  reloadPage,
  goBack,
  isVisible,
  waitForText,
} from './navigation.helper';
