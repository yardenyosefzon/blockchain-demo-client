import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/services/api';

export const fetchApiStatus = createAsyncThunk<string>('app/fetchApiStatus', async () => {
  const res = await api.get('/');
  if (typeof res.data === 'string') return res.data;
  if (res.data?.status) return String(res.data.status);
  return 'ok';
});
