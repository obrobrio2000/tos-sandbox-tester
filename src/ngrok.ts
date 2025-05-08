import ngrok from 'ngrok';
import dotenv from 'dotenv';

dotenv.config();

export async function setUrl() {
  // Skip ngrok setup in production environment
  //   if (process.env.NODE_ENV === 'production') {
  //     console.log('Skipping ngrok setup in production environment.');
  //     return null;
  //   }
  
  // Support for localhost and custom URLs
  //   let url = process.env.URL;
    
  //   if (url) {
  //     if (url.includes('localhost') || url.includes('127.0.0.1')) {
  //       console.log('Skipping ngrok setup as URL is localhost.');
  //       process.env.URL = undefined;
  //       return;
  //     }
  
  //     process.env.URL = url.replace(/\/$/, ''); // Remove trailing slash
  //     console.log('Using custom URL:', process.env.URL);
  //     return;
  //   }

  const authtoken = process.env.NGROK_AUTHTOKEN;
  if (!authtoken) {
    console.warn(
      'NGROK_AUTHTOKEN not found in .env. Skipping ngrok setup. Proceeding with no callback URL.',
    );
    return;
  }

  const port = Number(process.env.PORT || 3000);

  try {
    const url = await ngrok.connect({
      proto: 'http', // http|tcp|tls
      authtoken: authtoken,
      addr: port,
      // region: 'eu', // Optional: specify a region
      // subdomain: 'your-custom-subdomain' // Optional: if you have a paid plan and want a fixed subdomain
    });

    process.env.URL = url.replace(/\/$/, ''); // Remove trailing slash
    console.log('Ngrok tunnel established at:', process.env.URL);
    return;
  } catch (error) {
    // console.error('Error starting ngrok:', error);
    console.warn('Error starting ngrok. Proceeding with no callback URL.');
    return;
  }
}
