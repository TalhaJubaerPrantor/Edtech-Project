import './App.css';
import {Routes,Route} from 'react-router-dom'
import Home from './pages/Home';
import Navbar from './components/common/Navbar';
import OpenRoute from './components/core/Auth/OpenRoute'

import About from './pages/About';
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import VerifyEmail from './pages/VerifyEmail'
import UpdatePassword from "./pages/UpdatePassword"
import ForgotPassword from "./pages/ForgotPassword";
import Contact from "./pages/Contact"
import Error from "./pages/Error"
import Catalog from './pages/Catalog';
import CourseDetails from './pages/CourseDetails';
import MyProfile from './components/core/Dashboard/MyProfile'
import PrivateRoute from './components/core/Auth/PrivateRoute'
import Dashboard from './pages/Dashboard';
import Settings from "./components/core/Dashboard/Settings"


function App() {
  return (
    <div className="w-screen min-h-screen bg-richblack-900 flex flex-col font-inter">
        <Navbar/>
        <Routes>
            <Route path='/' element={<Home/>}/>
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
            <Route path="courses/:courseId" element={<CourseDetails />} />
             <Route path="catalog/:catalogName" element={<Catalog />} /> 

             {/* Open Route - for Only Non Logged in User */}
            <Route path="signup"
              element={
                <OpenRoute>
                    <Signup />
                </OpenRoute>
              }
            />

            <Route path="login"
              element={
                <OpenRoute>
                    <Login />
                </OpenRoute>
              }
            />
            <Route path="verify-email"
              element={
                <OpenRoute>
                  <VerifyEmail />
                </OpenRoute>
              }
            />
            <Route path="update-password/:id"
              element={
                <OpenRoute>
                  <UpdatePassword />
                </OpenRoute>
              }
            />
            <Route path="forgot-password"
              element={
                <OpenRoute>
                  <ForgotPassword />
                </OpenRoute>
              }
            />
            {/* Private Route - for Only Logged in User */}
            <Route
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />


            {/* Route for all users */}
            <Route path="dashboard/my-profile" element={<MyProfile />} />
            <Route path="dashboard/Settings" element={<Settings />} />


            <Route path="*" element={<Error />} />

        </Routes>
      
    </div>
  );
}

export default App;
