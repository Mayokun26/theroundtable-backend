import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Link from 'next/link';
import Head from 'next/head';
import CharacterGrid from '../components/CharacterGrid';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [characters, setCharacters] = useState([]);
  
  useEffect(() => {
    const loadCharacters = async () => {
      try {
        // Try to load characters from API if available
        try {
          const charactersResponse = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/characters`);
          if (charactersResponse.data.data) {
            setCharacters(charactersResponse.data.data);
          }
        } catch (error) {
          console.error('Using fallback characters');
          // We'll use the fallback characters from CharacterGrid component
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadCharacters();
  }, []);
  
  const handleStartConversation = () => {
    router.push('/conversation');
  };
  
  return (
    <>
      <Head>
        <title>The Round Table | Historical Conversations</title>
        <meta name="description" content="Engage in thought-provoking conversations with historical figures powered by AI" />
      </Head>
      
      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>The Round Table</h1>
        <p style={{ fontSize: '1.1rem', color: '#555', marginBottom: '2rem' }}>
          Welcome to The Round Table, a platform for engaging discussions with historical figures.
        </p>
        
        <div style={{ marginTop: '20px', marginBottom: '40px' }}>
          <button 
            onClick={handleStartConversation}
            style={{
              padding: '12px 24px',
              background: '#8B4513',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            Start a Conversation
          </button>
        </div>
        
        <h2 style={{ marginTop: '40px', marginBottom: '20px' }}>Available Historical Figures</h2>
        <CharacterGrid characters={characters} />
      </div>
    </>
  );
} 