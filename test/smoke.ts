import jwt from 'jsonwebtoken';
import { app } from '../src/app';

const srv = app.listen(3999, async () => {
  const t = jwt.sign({ sub: 'splp' }, 'rahasia', { expiresIn: '5m' });
  const bad = jwt.sign({ sub: 'splp' }, 'salah');
  const call = async (p: string, h: Record<string, string> = {}) => {
    const r = await fetch('http://localhost:3999' + p, { headers: h });
    return r.status + ' ' + (await r.text()).slice(0, 150);
  };
  console.log('no token   ', await call('/api/v1/datalist?page=1'));
  console.log('bad token  ', await call('/api/v1/datalist?page=1', { Authorization: 'Bearer ' + bad }));
  console.log('no page    ', await call('/api/v1/datalist/detail?id=1', { Authorization: 'Bearer ' + t }));
  console.log('admin nokey', await call('/api/admin/mappings'));
  console.log('docs.json  ', (await call('/docs.json')).slice(0, 40));
  console.log('docs ui    ', (await call('/docs/')).slice(0, 20));
  srv.close();
  process.exit(0);
});
