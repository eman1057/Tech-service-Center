import { useEffect, useState } from 'react';

const CreateReview = ({listing_id}) => {
    const [userDetails, setUserDetails] = useState([null]);

    useEffect(() => {
        fetch('http://localhost:3000/getOrderToBeReviewed', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                listing_id: listing_id
            })
        })
        .then(response => response.json().then(
            data => console.log(data)
        ))
        .then(data => {
           console.log(data)
        })
        .catch(error => {
            console.error(error);
        });
    }, []);

    if ( userDetails === null )
        return null;

    if ( userDetails.length === 0  && userDetails[0] === null ) {
        return (
            <div className="h-screen w-screen flex items-center justify-center text-center">
                <h1 className="text-3xl font-bold">Loading...</h1>
            </div>
        );
    }

    return (
        <div className="full-width-component">
            <h2>Write a Review</h2>
        </div>

    );
};


// id => determined by db
// rating => 1-5 
// order_id => sent as a prop
// service_listing_id => sent as a prop
// reservation_time => sent as a prop

export default CreateReview;