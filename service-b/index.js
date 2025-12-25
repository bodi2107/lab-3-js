const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// naive inefficient implementation on purpose (matches lab variant 4)
const movies = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'movies.json'), 'utf8'));

function getTopNByGenre(genre, limit){
  // return matching movies by genre (no artificial duplication)
  const filtered = movies.filter(m => m.genre && m.genre.toLowerCase() === genre.toLowerCase());
  // ensure uniqueness by id just in case
  const unique = Array.from(new Map(filtered.map(m => [m.id, m])).values());
  // sort by rating desc, then by title asc for stable ordering
  unique.sort((a,b)=>{
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.title.localeCompare(b.title);
  });
  if (Number.isInteger(limit) && limit > 0) {
    return unique.slice(0, limit).map(m=>({id:m.id,title:m.title,year:m.year,genre:m.genre,rating:m.rating,description:m.description}));
  }
  // if no valid limit provided, return all matches
  return unique.map(m=>({id:m.id,title:m.title,year:m.year,genre:m.genre,rating:m.rating,description:m.description}));
}

app.get('/recommendations', (req,res)=>{
  const genre = req.query.genre || '';
  const limit = req.query.limit ? parseInt(req.query.limit,10) : undefined;
  if(!genre){
    return res.status(400).json({error:'genre required'});
  }
  const start = Date.now();
  const result = getTopNByGenre(genre, limit);
  const work = Date.now()-start;
  res.json({genre,limit: limit || null,result,proc_ms:work});
});

app.get('/health', (req,res)=>res.json({status:'ok'}));

app.listen(PORT, ()=>console.log('service-b listening on',PORT));
