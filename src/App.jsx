import { useEffect, useRef, useState } from 'react'
import './App.css'

function App() {
  const canvasRef = useRef(null)
  const [gameState, setGameState] = useState('menu') // menu, playing, gameover
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const gameRef = useRef(null)
  const touchStartX = useRef(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    
    // Responsive canvas sizing
    const isMobileDevice = window.innerWidth < 768
    setIsMobile(isMobileDevice)
    canvas.width = isMobileDevice ? Math.min(window.innerWidth - 20, 600) : 800
    canvas.height = isMobileDevice ? window.innerHeight - 100 : 600

    // Game state
    const game = {
      player: {
        x: canvas.width / 2 - 20,
        y: canvas.height - 60,
        width: 40,
        height: 40,
        speed: 7,
        color: '#00ffff'
      },
      shapes: [],
      particles: [],
      keys: {},
      score: 0,
      combo: 0,
      survivalTimer: 0,
      difficultyTimer: 0,
      spawnTimer: 0,
      bossTimer: 0,
      gameSpeed: 1.5,
      shapeSpawnRate: 45,
      lastDodgeTime: 0,
      isGameOver: false
    }

    gameRef.current = game

    // Shape types
    const shapeTypes = {
      CUBE: 'cube',
      SPIKE: 'spike',
      DISC: 'disc',
      CROSS: 'cross',
      SPLITTER: 'splitter',
      BONUS: 'bonus',
      BOSS: 'boss'
    }

    // Create shape
    function createShape(type = null) {
      if (!type) {
        const rand = Math.random()
        if (rand < 0.3) type = shapeTypes.CUBE
        else if (rand < 0.5) type = shapeTypes.SPIKE
        else if (rand < 0.65) type = shapeTypes.DISC
        else if (rand < 0.8) type = shapeTypes.CROSS
        else if (rand < 0.95) type = shapeTypes.SPLITTER
        else type = shapeTypes.BONUS
      }

      const size = type === shapeTypes.BOSS ? 80 : 
                   type === shapeTypes.BONUS ? 25 : 40
      
      const shape = {
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        type: type,
        speed: (3.5 + game.gameSpeed * 0.8) * (type === shapeTypes.BOSS ? 0.8 : 1),
        rotation: 0,
        rotationSpeed: type === shapeTypes.CROSS ? 0.08 : 0.03,
        hasSplit: false,
        color: getShapeColor(type)
      }

      return shape
    }

    function getShapeColor(type) {
      switch(type) {
        case shapeTypes.CUBE: return '#00ffff'
        case shapeTypes.SPIKE: return '#ff00ff'
        case shapeTypes.DISC: return '#ffff00'
        case shapeTypes.CROSS: return '#ff0088'
        case shapeTypes.SPLITTER: return '#00ff88'
        case shapeTypes.BONUS: return '#ffffff'
        case shapeTypes.BOSS: return '#ff0000'
        default: return '#00ffff'
      }
    }

    // Create particles
    function createParticles(x, y, color) {
      for (let i = 0; i < 15; i++) {
        game.particles.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 1,
          color: color,
          size: Math.random() * 4 + 2
        })
      }
    }

    // Collision detection
    function checkCollision(rect1, rect2) {
      return rect1.x < rect2.x + rect2.width &&
             rect1.x + rect1.width > rect2.x &&
             rect1.y < rect2.y + rect2.height &&
             rect1.y + rect1.height > rect2.y
    }

    // Draw grid background
    function drawBackground() {
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Neon grid
      ctx.strokeStyle = '#00ffff22'
      ctx.lineWidth = 1
      const gridSize = 40

      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }

      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }
    }

    // Draw player
    function drawPlayer() {
      const p = game.player
      
      // Glow effect
      ctx.shadowBlur = 20
      ctx.shadowColor = p.color
      
      ctx.fillStyle = p.color
      ctx.fillRect(p.x, p.y, p.width, p.height)
      
      // Border
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.strokeRect(p.x, p.y, p.width, p.height)
      
      ctx.shadowBlur = 0
    }

    // Draw shapes
    function drawShape(shape) {
      ctx.save()
      ctx.translate(shape.x + shape.width / 2, shape.y + shape.height / 2)
      ctx.rotate(shape.rotation)
      
      ctx.shadowBlur = 15
      ctx.shadowColor = shape.color
      
      ctx.fillStyle = shape.color
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2

      switch(shape.type) {
        case shapeTypes.CUBE:
          ctx.fillRect(-shape.width/2, -shape.height/2, shape.width, shape.height)
          ctx.strokeRect(-shape.width/2, -shape.height/2, shape.width, shape.height)
          break
        
        case shapeTypes.SPIKE:
          ctx.beginPath()
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2
            const radius = i % 2 === 0 ? shape.width / 2 : shape.width / 4
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
          break
        
        case shapeTypes.DISC:
          ctx.beginPath()
          ctx.arc(0, 0, shape.width / 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          break
        
        case shapeTypes.CROSS:
          const w = shape.width / 6
          const h = shape.height / 2
          ctx.fillRect(-w, -h, w * 2, h * 2)
          ctx.fillRect(-h, -w, h * 2, w * 2)
          ctx.strokeRect(-w, -h, w * 2, h * 2)
          ctx.strokeRect(-h, -w, h * 2, w * 2)
          break
        
        case shapeTypes.SPLITTER:
          ctx.beginPath()
          ctx.moveTo(0, -shape.height / 2)
          ctx.lineTo(shape.width / 2, shape.height / 2)
          ctx.lineTo(-shape.width / 2, shape.height / 2)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
          break
        
        case shapeTypes.BONUS:
          ctx.beginPath()
          for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
            const radius = shape.width / 2
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
            
            const angle2 = ((i + 0.5) / 5) * Math.PI * 2 - Math.PI / 2
            const x2 = Math.cos(angle2) * radius * 0.4
            const y2 = Math.sin(angle2) * radius * 0.4
            ctx.lineTo(x2, y2)
          }
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
          break
        
        case shapeTypes.BOSS:
          ctx.fillRect(-shape.width/2, -shape.height/2, shape.width, shape.height)
          ctx.strokeRect(-shape.width/2, -shape.height/2, shape.width, shape.height)
          
          // Boss pattern
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(-shape.width/4, -shape.height/4, shape.width/2, shape.height/2)
          break
      }
      
      ctx.restore()
    }

    // Draw particles
    function drawParticles() {
      game.particles.forEach((p, index) => {
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.life
        ctx.fillRect(p.x, p.y, p.size, p.size)
        
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.02
        
        if (p.life <= 0) {
          game.particles.splice(index, 1)
        }
      })
      ctx.globalAlpha = 1
    }

    // Draw HUD
    function drawHUD() {
      ctx.shadowBlur = 0
      ctx.font = 'bold 24px monospace'
      ctx.fillStyle = '#00ffff'
      ctx.fillText(`SCORE: ${Math.floor(game.score)}`, 20, 40)
      
      if (game.combo > 1) {
        ctx.fillStyle = '#ffff00'
        ctx.fillText(`COMBO x${game.combo}`, 20, 70)
      }
      
      ctx.fillStyle = '#ff00ff'
      ctx.font = 'bold 16px monospace'
      ctx.fillText(`SPEED: ${game.gameSpeed.toFixed(1)}x`, canvas.width - 150, 40)
    }

    // Update game
    function update() {
      if (game.isGameOver) return

      // Player movement
      if (game.keys['ArrowLeft'] || game.keys['a'] || game.keys['A']) {
        game.player.x -= game.player.speed
      }
      if (game.keys['ArrowRight'] || game.keys['d'] || game.keys['D']) {
        game.player.x += game.player.speed
      }

      // Keep player in bounds
      game.player.x = Math.max(0, Math.min(canvas.width - game.player.width, game.player.x))

      // Spawn shapes
      game.spawnTimer++
      if (game.spawnTimer >= game.shapeSpawnRate) {
        game.shapes.push(createShape())
        game.spawnTimer = 0
      }

      // Boss spawn
      game.bossTimer++
      if (game.bossTimer >= 720) { // Every 12 seconds
        game.shapes.push(createShape(shapeTypes.BOSS))
        game.bossTimer = 0
      }

      // Update shapes
      for (let i = game.shapes.length - 1; i >= 0; i--) {
        const shape = game.shapes[i]
        shape.y += shape.speed
        shape.rotation += shape.rotationSpeed

        // Splitter logic
        if (shape.type === shapeTypes.SPLITTER && !shape.hasSplit && 
            shape.y > canvas.height / 2) {
          shape.hasSplit = true
          // Split into smaller pieces
          for (let j = 0; j < 5; j++) {
            const mini = {
              ...shape,
              width: 20,
              height: 20,
              x: shape.x + (j - 2) * 25,
              speed: shape.speed * 1.8,
              type: shapeTypes.CUBE
            }
            game.shapes.push(mini)
          }
          game.shapes.splice(i, 1)
          continue
        }

        // Collision with player
        if (checkCollision(game.player, shape)) {
          if (shape.type === shapeTypes.BONUS) {
            game.score += 50 * (game.combo || 1)
            game.combo++
            createParticles(shape.x + shape.width / 2, shape.y + shape.height / 2, shape.color)
            game.shapes.splice(i, 1)
          } else {
            // Game over
            game.isGameOver = true
            createParticles(game.player.x + game.player.width / 2, 
                          game.player.y + game.player.height / 2, 
                          game.player.color)
            setGameState('gameover')
            if (game.score > highScore) {
              setHighScore(Math.floor(game.score))
            }
          }
          continue
        }

        // Remove off-screen shapes
        if (shape.y > canvas.height) {
          game.shapes.splice(i, 1)
          game.lastDodgeTime = Date.now()
          
          // Check for combo
          if (Date.now() - game.lastDodgeTime < 2000) {
            game.combo++
          } else {
            game.combo = 1
          }
        }
      }

      // Survival scoring
      game.survivalTimer++
      if (game.survivalTimer >= 60) { // Every second
        game.score += 1 * (game.combo || 1)
        game.survivalTimer = 0
      }

      // Difficulty increase
      game.difficultyTimer++
      if (game.difficultyTimer >= 240) { // Every 4 seconds
        game.gameSpeed += 0.15
        game.shapeSpawnRate = Math.max(20, game.shapeSpawnRate - 3)
        game.difficultyTimer = 0
      }

      setScore(Math.floor(game.score))
    }

    // Draw CRT effect
    function drawCRTEffect() {
      // Scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      for (let i = 0; i < canvas.height; i += 4) {
        ctx.fillRect(0, i, canvas.width, 2)
      }
    }

    // Game loop
    let animationId
    function gameLoop() {
      if (gameState === 'playing') {
        update()
        
        drawBackground()
        drawPlayer()
        game.shapes.forEach(drawShape)
        drawParticles()
        drawHUD()
        drawCRTEffect()
      }
      
      animationId = requestAnimationFrame(gameLoop)
    }

    // Touch controls for mobile
    function handleTouchStart(e) {
      e.preventDefault()
      touchStartX.current = e.touches[0].clientX
    }

    function handleTouchMove(e) {
      e.preventDefault()
      if (!touchStartX.current) return
      
      const touchX = e.touches[0].clientX
      const rect = canvas.getBoundingClientRect()
      const relativeX = touchX - rect.left
      
      // Move player to touch position
      game.player.x = Math.max(0, Math.min(canvas.width - game.player.width, relativeX - game.player.width / 2))
    }

    function handleTouchEnd(e) {
      e.preventDefault()
      touchStartX.current = 0
    }

    // Keyboard controls
    function handleKeyDown(e) {
      game.keys[e.key] = true
    }

    function handleKeyUp(e) {
      game.keys[e.key] = false
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false })
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    gameLoop()

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      cancelAnimationFrame(animationId)
    }
  }, [gameState, highScore])

  const startGame = () => {
    setGameState('playing')
    setScore(0)
    if (gameRef.current) {
      gameRef.current.score = 0
      gameRef.current.combo = 0
      gameRef.current.shapes = []
      gameRef.current.particles = []
      gameRef.current.survivalTimer = 0
      gameRef.current.difficultyTimer = 0
      gameRef.current.spawnTimer = 0
      gameRef.current.bossTimer = 0
      gameRef.current.gameSpeed = 1.5
      gameRef.current.shapeSpawnRate = 45
      gameRef.current.isGameOver = false
      gameRef.current.player.x = 380
    }
  }

  return (
    <div className="game-container">
      <canvas ref={canvasRef} />
      
      {gameState === 'menu' && (
        <div className="overlay">
          <div className="menu">
            <h1 className="title">STACK ATTACK</h1>
            <p className="subtitle">Reflex / Tower Dodge</p>
            <button className="neon-button" onClick={startGame}>
              START GAME
            </button>
            <div className="instructions">
              <p>{isMobile ? 'Touch and drag to move' : '← → or A D to move'}</p>
              <p>Dodge falling shapes!</p>
              <p className="high-score">HIGH SCORE: {highScore}</p>
            </div>
          </div>
        </div>
      )}
      
      {gameState === 'gameover' && (
        <div className="overlay">
          <div className="menu">
            <h1 className="title game-over">GAME OVER</h1>
            <p className="final-score">SCORE: {score}</p>
            <p className="high-score">HIGH SCORE: {highScore}</p>
            <button className="neon-button" onClick={startGame}>
              PLAY AGAIN
            </button>
            <button className="neon-button secondary" onClick={() => setGameState('menu')}>
              MAIN MENU
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
