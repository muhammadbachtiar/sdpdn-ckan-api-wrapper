import { Router } from 'express';
import * as admin from '../controllers/admin.controller';
import * as sdpdn from '../controllers/sdpdn.controller';
import { adminAuth, passiveJwt } from '../middlewares';

export const sdpdnRouter = Router();
sdpdnRouter.use(passiveJwt);
sdpdnRouter.get('/datalist', sdpdn.getDatalist);
sdpdnRouter.get('/datalist/detail', sdpdn.getDetail);

export const adminRouter = Router();
adminRouter.use(adminAuth);
adminRouter.get('/mappings', admin.listMappings);
adminRouter.post('/mappings', admin.createMapping);
adminRouter.get('/mappings/:id', admin.getMapping);
adminRouter.put('/mappings/:id', admin.updateMapping);
adminRouter.delete('/mappings/:id', admin.deleteMapping);
adminRouter.get('/mappings/:id/preview', admin.previewMapping);
