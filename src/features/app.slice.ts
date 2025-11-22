import { createSlice } from '@reduxjs/toolkit';
import { fetchApiStatus } from './app.thunks';

type AppState = {
  loading: boolean;
  status: string | null;
  error: string | null;
};

const initialState: AppState = {
  loading: false,
  status: null,
  error: null,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchApiStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApiStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload;
      })
      .addCase(fetchApiStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Request failed';
      });
  },
});

export default appSlice.reducer;
