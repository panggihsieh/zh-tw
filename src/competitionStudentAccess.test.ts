import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {competitionRequest,competitionStudentRequest} from './competitionApi';
const auth=vi.hoisted(()=>({services:vi.fn(),token:vi.fn()}));
vi.mock('./cloudSync',()=>({cloudServices:auth.services}));
beforeEach(()=>{
 vi.clearAllMocks();
 auth.token.mockResolvedValue('teacher-token');
 auth.services.mockReturnValue({auth:{currentUser:{getIdToken:auth.token}}});
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({ok:true})}));
});
afterEach(()=>vi.unstubAllGlobals());
it('學生加入及作答不讀取Google身分，即使瀏覽器已登入',async()=>{
 await competitionStudentRequest('/code/ABCD');
 await competitionStudentRequest('/rooms/room/join',{seat:1});
 expect(auth.services).not.toHaveBeenCalled();
 for(const [,options] of vi.mocked(fetch).mock.calls)expect(options?.headers).not.toHaveProperty('Authorization');
});
it('教師管理請求仍需傳送已登入憑證',async()=>{
 await competitionRequest('/rooms');
 expect(auth.token).toHaveBeenCalledOnce();
 expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toHaveProperty('Authorization','Bearer teacher-token');
});
