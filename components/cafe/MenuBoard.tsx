'use client'

import { Text } from '@react-three/drei'

// Small chalkboard menu near the bar counter — handwritten-feeling list of
// drinks. Faces into the room from the front wall, off to the side of the bar.
export default function MenuBoard() {
  return (
    <group position={[-3.0, 1.85, 4.93]} rotation={[0, Math.PI, 0]}>
      {/* Frame */}
      <mesh>
        <boxGeometry args={[0.55, 0.78, 0.025]} />
        <meshLambertMaterial color="#2a1810" flatShading />
      </mesh>
      {/* Chalkboard surface */}
      <mesh position={[0, 0, 0.014]}>
        <planeGeometry args={[0.48, 0.70]} />
        <meshLambertMaterial color="#181a18" flatShading />
      </mesh>

      <Text
        position={[0, 0.28, 0.018]}
        fontSize={0.045}
        color="#e8d090"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.1}
      >
        ~ MENU ~
      </Text>

      {/* Items — small, slightly different colors to fake handwritten chalk */}
      {[
        { name: 'Drip Coffee', price: '¥500', y: 0.16 },
        { name: 'Espresso', price: '¥450', y: 0.08 },
        { name: 'Cafe Latte', price: '¥600', y: 0.00 },
        { name: 'Hot Cocoa', price: '¥550', y: -0.08 },
        { name: 'Houjicha', price: '¥500', y: -0.16 },
        { name: 'Whisky Highball', price: '¥800', y: -0.24 },
      ].map((item) => (
        <group key={item.name}>
          <Text
            position={[-0.21, item.y, 0.018]}
            fontSize={0.028}
            color="#d8c890"
            anchorX="left"
            anchorY="middle"
          >
            {item.name}
          </Text>
          <Text
            position={[0.21, item.y, 0.018]}
            fontSize={0.026}
            color="#b8a070"
            anchorX="right"
            anchorY="middle"
          >
            {item.price}
          </Text>
        </group>
      ))}
    </group>
  )
}
