import { RouterProvider, createBrowserRouter, useNavigate } from "react-router-dom";

import LandingPage from "../components/LandingPage/LandingPage";
import Login from '../components/Login/Login'
import Register from '../components/Register/Register'
import SearchPage from "../components/SearchPage/SearchPage"
import ProfileEdit from "../components/ProfileEdit/ProfileEdit";
import Dashboard from "../components/Dashboard/Dashboard";
import ListingPage from "../components/Listings/ListingPage";
import TroubleshootingPage from "../components/Troubleshooting";
import CreateNewListing from "../components/Listings/CreateNewListing";

import { useEffect } from "react";
import { clearUserDetails } from "./utils";

function App() {
    const Routes=createBrowserRouter([
        {path: "/", element: <LandingPage/>},
        {path: "/signin", element: <Login/>},
        {path: "/register", element: <Register />},
        {path: "/search", element: <SearchPage/>},
        {path: "/profile", element: <ProfileEdit />},
        {path: "/dashboard", element: <Dashboard />},
        {path: "/viewListing", element: <ListingPage />},
        {path: "/signout", element: <Signout />},
        {path: '/troubleshooting', element: <TroubleshootingPage />},
        {path: '/createListing', element: <CreateNewListing />}
    ])

    return (
        <RouterProvider router={Routes}>
            <LandingPage/>
        </RouterProvider>
    );
}

function Signout() {
    const navigate = useNavigate();

    useEffect(() => {
        fetch('http://localhost:3000/logout', {
            method: 'PUT',
            credentials: 'include'
        })
        .then(response => {
            if ( response.status === 200 )
                clearUserDetails();

            navigate('/')
        })
        .catch(error => {
            console.error(error);
        });
    }, [navigate]);

    return (
        <div className="h-screen w-screen flex items-center justify-center text-center">
            <h1 className="text-3xl font-bold">Logging out...</h1>
        </div>
    )
}

export default App;
