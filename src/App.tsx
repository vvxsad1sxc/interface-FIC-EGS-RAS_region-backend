import {Route, Routes, Navigate} from 'react-router-dom'
import Header from '@/pages/Header/Header'
import Footer from '@/pages/Footer/Footer'
import InfoPage from '@pages/InfoPage/InfoPage.tsx'
import StationsPage from '@pages/StationPages/StationsPage.tsx'
import AccessPage from '@pages/AccessPage/AccessPage.tsx'
import Login from '@pages/Authorization/Login/Login.tsx'
import RegionPage from '@pages/RegionPage/RegionPage.tsx'
import Registration from '@pages/Authorization/Registration/Registration.tsx'
import '@pages/Authorization/Authorization.scss'
import AdminPanel from '@pages/AdminPanel/AdminPanel.tsx'
import DownloadPage from '@pages/DownloadPage/DownloadPage.tsx'
import ForgotPassword from '@pages/ForgotPassword/ForgotPassword.tsx'
import ResetPassword from '@pages/ResetPassword/ResetPassword.tsx'


function App() {
  return (
    <>
      <div className="page__container">
        <Header />
        <Routes>
          <Route path='/' element={<Navigate to='/Information' replace />} />
          <Route path='/Information' element={<InfoPage />} />
          <Route path='/Stations' element={<StationsPage />} />
          <Route path='/Access' element={<AccessPage />} />
          <Route path='/Login' element={<Login />} />
          <Route path='/Registration' element={<Registration />} />
          <Route path="/region/:regionId" element={<RegionPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/download" element={<DownloadPage />} />
           <Route path="/admin" element={<AdminPanel />} />
        </Routes>
        <Footer />
      </div>
    </>
  );
}

export default App;