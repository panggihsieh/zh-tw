import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSchoolIamTeacher } from './schooliam-policy.mjs';

test('教師試點只接受已啟用的明確帳號對照，拒絕學生及冒用管理者', () => {
  const user = { uid: 'local-teacher', email: 'teacher.hsieh@gmail.com', emailVerified: true, disabled: false, providerData: [{ providerId: 'google.com' }] };
  const link = { iamUid: 'iam-teacher', localUid: user.uid, role: 'teacher', enabled: true };
  assert.equal(resolveSchoolIamTeacher('iam-teacher', link, user), user.uid);
  for (const patch of [{ role: 'student' }, { enabled: false }, { iamUid: 'other' }, { localUid: 'other' }])
    assert.throws(() => resolveSchoolIamTeacher('iam-teacher', { ...link, ...patch }, user));
  for (const patch of [{ email: 'student@example.com' }, { disabled: true }, { emailVerified: false }, { providerData: [] }])
    assert.throws(() => resolveSchoolIamTeacher('iam-teacher', link, { ...user, ...patch }));
});
