import { ADMIN_EMAIL } from './admin-auth.mjs';

// Teacher pilot only. A role from the browser never grants local privileges.
export function resolveSchoolIamTeacher(subject, link, user) {
  if (!subject || link?.enabled !== true || link.role !== 'teacher' ||
      link.iamUid !== subject || link.localUid !== user?.uid ||
      user.disabled || user.emailVerified !== true || user.email !== ADMIN_EMAIL ||
      !user.providerData?.some(p => p.providerId === 'google.com')) {
    throw new Error('SchoolIAM 帳號尚未獲得教師接入授權');
  }
  return user.uid;
}
