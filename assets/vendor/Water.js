import {
	Color,
	FrontSide,
	HalfFloatType,
	Matrix4,
	Mesh,
	PerspectiveCamera,
	Plane,
	ShaderMaterial,
	UniformsLib,
	UniformsUtils,
	Vector3,
	Vector4,
	WebGLRenderTarget
} from 'three';

/**
 * Work based on :
 * https://github.com/Slayvin: Flat mirror for three.js
 * https://home.adelphi.edu/~stemkoski/ : An implementation of water shader based on the flat mirror
 * http://29a.ch/ && http://29a.ch/slides/2012/webglwater/ : Water shader explanations in WebGL
 */

class Water extends Mesh {

	constructor( geometry, options = {} ) {

		super( geometry );

		this.isWater = true;

		const scope = this;

		const textureWidth = options.textureWidth !== undefined ? options.textureWidth : 512;
		const textureHeight = options.textureHeight !== undefined ? options.textureHeight : 512;

		const clipBias = options.clipBias !== undefined ? options.clipBias : 0.0;
		const alpha = options.alpha !== undefined ? options.alpha : 1.0;
		const time = options.time !== undefined ? options.time : 0.0;
		const normalSampler = options.waterNormals !== undefined ? options.waterNormals : null;
		const sunDirection = options.sunDirection !== undefined ? options.sunDirection : new Vector3( 0.70707, 0.70707, 0.0 );
		const sunColor = new Color( options.sunColor !== undefined ? options.sunColor : 0xffffff );
		const waterColor = new Color( options.waterColor !== undefined ? options.waterColor : 0x7F7F7F );
		const eye = options.eye !== undefined ? options.eye : new Vector3( 0, 0, 0 );
		const distortionScale = options.distortionScale !== undefined ? options.distortionScale : 20.0;
		const side = options.side !== undefined ? options.side : FrontSide;
		const fog = options.fog !== undefined ? options.fog : false;

		//

		const mirrorPlane = new Plane();
		const normal = new Vector3();
		const mirrorWorldPosition = new Vector3();
		const cameraWorldPosition = new Vector3();
		const rotationMatrix = new Matrix4();
		const lookAtPosition = new Vector3( 0, 0, - 1 );
		const clipPlane = new Vector4();

		const view = new Vector3();
		const target = new Vector3();
		const q = new Vector4();

		const textureMatrix = new Matrix4();

		const mirrorCamera = new PerspectiveCamera();

		const renderTarget = new WebGLRenderTarget( textureWidth, textureHeight, { type: HalfFloatType } );

		const mirrorShader = {

			name: 'MirrorShader',

			uniforms: UniformsUtils.merge( [
				UniformsLib[ 'fog' ],
				UniformsLib[ 'lights' ],
				{
					'normalSampler': { value: null },
					'mirrorSampler': { value: null },
					'alpha': { value: 1.0 },
					'time': { value: 0.0 },
					'size': { value: 1.0 },
					'distortionScale': { value: 20.0 },
					'textureMatrix': { value: new Matrix4() },
					'sunColor': { value: new Color( 0x7F7F7F ) },
					'sunDirection': { value: new Vector3( 0.70707, 0.70707, 0 ) },
					'eye': { value: new Vector3() },
					'waterColor': { value: new Color( 0x555555 ) },
					'uT': { value: 0.0 },
					'foamCol': { value: new Color( 0xffffff ) },
					'uRain': { value: 0.0 },
					'uWave': { value: 0.1 },
					'trails': { value: [ new Vector4(), new Vector4(), new Vector4(), new Vector4() ] },
					'ripples': { value: [ new Vector3( 0, 0, - 100 ), new Vector3( 0, 0, - 100 ), new Vector3( 0, 0, - 100 ), new Vector3( 0, 0, - 100 ), new Vector3( 0, 0, - 100 ), new Vector3( 0, 0, - 100 ) ] }
				}
			] ),

			vertexShader: /* glsl */`
				uniform mat4 textureMatrix;
				uniform float time;
				uniform float uT;

				varying vec4 mirrorCoord;
				varying vec4 worldPosition;
				varying vec3 vWave;

				float groundY( vec2 p ) {
					float s = p.y + 3.0 + 1.2 * sin( p.x * 0.35 ) + 0.6 * sin( p.x * 1.1 + 2.0 ) + 0.25 * sin( p.x * 2.7 + 1.0 );
					return clamp( s * 0.13, -0.7, 0.45 ) + 0.03 * sin( p.x * 2.1 ) * sin( p.y * 1.7 ) + 0.012 * sin( p.x * 5.3 + p.y * 3.1 );
				}

				uniform float uWave;
				// Cinco trenes de olas de viento (dirección, longitud, altura). Devuelve altura y pendiente.
				vec3 waveSum( vec2 p, float t, float dist ) {
					vec3 r = vec3( 0.0 );
					#define WAVE( dx, dz, lam, amp ) { float k = 6.2832 / lam; float th = dot( p, vec2( dx, dz ) ) * k - sqrt( 9.8 * k ) * t; float a = amp * ( 1.0 - smoothstep( lam * 6.0, lam * 14.0, dist ) ); r.x += a * sin( th ); r.yz += vec2( dx, dz ) * a * k * cos( th ); }
					WAVE( 0.954, 0.300, 2.2, 0.020 )
					WAVE( 0.800, 0.600, 1.5, 0.016 )
					WAVE( 0.970, - 0.243, 0.95, 0.010 )
					WAVE( 0.894, 0.447, 0.60, 0.006 )
					WAVE( 0.990, 0.141, 3.6, 0.016 )
					return r;
				}

				#include <common>
				#include <fog_pars_vertex>
				#include <shadowmap_pars_vertex>
				#include <logdepthbuf_pars_vertex>

				void main() {
					vec4 wp = modelMatrix * vec4( position, 1.0 );
					mirrorCoord = textureMatrix * wp;
					// relieve real: la malla sube y baja con las olas, que se apagan al llegar a la orilla
					vWave = waveSum( wp.xz, uT, length( wp.xyz - cameraPosition ) ) * uWave * smoothstep( - 0.08, 0.12, - groundY( wp.xz ) );
					wp.y += vWave.x;
					worldPosition = wp;
					vec4 mvPosition = viewMatrix * wp;
					gl_Position = projectionMatrix * mvPosition;

				#include <beginnormal_vertex>
				#include <defaultnormal_vertex>
				#include <logdepthbuf_vertex>
				#include <fog_vertex>
				#include <shadowmap_vertex>
			}`,

			fragmentShader: /* glsl */`
				uniform sampler2D mirrorSampler;
				uniform float alpha;
				uniform float time;
				uniform float size;
				uniform float distortionScale;
				uniform sampler2D normalSampler;
				uniform vec3 sunColor;
				uniform vec3 sunDirection;
				uniform vec3 eye;
				uniform vec3 waterColor;
				uniform float uT;
				uniform vec3 foamCol;
				uniform float uRain;
				// anillo de una gota: cada celda de la rejilla tiene su gota, con su propio ritmo
				vec2 rainRing( vec2 p, float t ) {
					vec2 id = floor( p ), f = fract( p ) - 0.5;
					float h = fract( sin( dot( id, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
					float ph = fract( t * 0.9 + h * 7.0 );
					vec2 d = f - ( vec2( fract( h * 13.3 ), fract( h * 71.7 ) ) - 0.5 ) * 0.5;
					float r = length( d ), front = ph * 0.42;
					return d / max( r, 0.01 ) * sin( ( r - front ) * 55.0 ) * smoothstep( 0.06, 0.0, abs( r - front ) ) * ( 1.0 - ph );
				}
				uniform vec4 trails[ 4 ];    // x, z, rumbo, intensidad
				uniform vec3 ripples[ 6 ];   // x, z, instante en que el pez toca la superficie

				float groundY( vec2 p ) {
					float s = p.y + 3.0 + 1.2 * sin( p.x * 0.35 ) + 0.6 * sin( p.x * 1.1 + 2.0 ) + 0.25 * sin( p.x * 2.7 + 1.0 );
					return clamp( s * 0.13, -0.7, 0.45 ) + 0.03 * sin( p.x * 2.1 ) * sin( p.y * 1.7 ) + 0.012 * sin( p.x * 5.3 + p.y * 3.1 );
				}

				varying vec4 mirrorCoord;
				varying vec4 worldPosition;
				varying vec3 vWave;
				uniform float uWave;

				vec4 getNoise( vec2 uv ) {
					vec2 uv0 = ( uv / 103.0 ) + vec2(time / 17.0, time / 29.0);
					vec2 uv1 = uv / 107.0-vec2( time / -19.0, time / 31.0 );
					vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );
					vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );
					vec4 noise = texture2D( normalSampler, uv0 ) +
						texture2D( normalSampler, uv1 ) +
						texture2D( normalSampler, uv2 ) +
						texture2D( normalSampler, uv3 );
					return noise * 0.5 - 1.0;
				}

				void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {
					vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );
					float direction = max( 0.0, dot( eyeDirection, reflection ) );
					specularColor += pow( direction, shiny ) * sunColor * spec;
					diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * sunColor * diffuse;
				}

				#include <common>
				#include <packing>
				#include <bsdfs>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <lights_pars_begin>
				#include <shadowmap_pars_fragment>
				#include <shadowmask_pars_fragment>

				void main() {

					#include <logdepthbuf_fragment>
					float depth = - groundY( worldPosition.xz );
					float runup = 0.010 + 0.008 * sin( uT * 0.33 + worldPosition.x * 0.21 ) + 0.006 * sin( uT * 0.9 + worldPosition.x * 0.8 ) + 0.004 * sin( uT * 1.7 - worldPosition.x * 2.3 );
					float ragged = ( texture2D( normalSampler, worldPosition.xz * 0.35 ).r - 0.5 ) * 0.034 + ( texture2D( normalSampler, worldPosition.xz * 1.7 ).g - 0.5 ) * 0.014;
					float edge = depth + vWave.x - runup + ragged;
					if ( edge < 0.0 ) discard;
					float shallow = 1.0 - smoothstep( 0.03, 0.6, depth );
					float phs = depth * 55.0 + uT * 2.2 + sin( worldPosition.x * 0.7 ) * 1.5;
					vec4 noise = getNoise( worldPosition.xz * size );
					vec2 rip = vec2( 0.0 );
					if ( uRain > 0.01 ) {
						float rd = 1.0 - smoothstep( 22.0, 60.0, length( eye - worldPosition.xyz ) );
						rip += ( rainRing( worldPosition.xz / 0.28, uT ) + rainRing( worldPosition.xz / 0.47 + 3.7, uT * 1.13 ) + rainRing( worldPosition.xz / 0.19 + 9.1, uT * 0.87 ) ) * uRain * 0.75 * rd;
					}
					for ( int i = 0; i < 6; i ++ ) {
						vec2 dv = worldPosition.xz - ripples[ i ].xy;
						float r = length( dv ), age = uT - ripples[ i ].z;
						if ( age > 0.0 && age < 10.0 && r < 6.0 ) {
							float front = 0.45 * age;
							float env = smoothstep( front + 0.08, front - 0.05, r ) * exp( - ( front - r ) * 1.0 ) * exp( - age * 0.36 );
							rip += dv / max( r, 0.02 ) * sin( ( r - front ) * 15.0 ) * env;
						}
					}
					for ( int i = 0; i < 4; i ++ ) {
						vec4 tr = trails[ i ];
						if ( tr.w > 0.001 ) {
							vec2 dv = worldPosition.xz - tr.xy;
							vec2 dir = vec2( cos( tr.z ), sin( tr.z ) );
							float al = - dot( dv, dir );
							float ac = dv.y * dir.x - dv.x * dir.y;
							ac += 0.035 * al * sin( al * 1.3 + float( i ) * 2.1 + uT * 0.3 ) + ( noise.x * 0.06 ) * min( al, 3.0 );   // la estela serpentea, no es una regla
							if ( al > - 0.4 && al < 9.0 && abs( ac ) < 3.4 ) {
								// brazos de la V, que se abren y se apagan hacia atrás
								float wd = 0.05 + al * 0.10;
								float arm = al * 0.33 + 0.02;
								float d1 = abs( ac ) - arm;
								float env = exp( - d1 * d1 / ( wd * wd ) ) * exp( - al * 0.48 ) * smoothstep( - 0.3, 0.15, al ) * ( 0.82 + 0.18 * sin( al * 7.0 - uT * 3.0 + float( i ) ) );
								rip += vec2( - dir.y, dir.x ) * sign( ac ) * ( d1 / wd ) * env * tr.w * 0.6;
								// ondas transversales dentro de la V
								float inside = smoothstep( arm, arm * 0.3, abs( ac ) ) * exp( - al * 0.45 ) * step( 0.0, al );
								rip += dir * sin( al * 9.0 - uT * 5.0 ) * inside * tr.w * 0.22;
								// abultamiento del agua sobre la cabeza
								rip += dv * exp( - dot( dv, dv ) / 0.02 ) * tr.w * 4.0;
							}
						}
					}
					float calm = ( 0.35 + 0.65 * smoothstep( 0.0, 0.25, depth ) ) * ( 1.0 + 0.7 * uRain );
					// oleaje corto y continuo que empuja el viento: tres trenes de olas con crestas rotas
					vec2 swell = vec2( 0.0 );
					if ( false ) {
						vec2 w1 = vec2( 0.954, 0.300 ), w2 = vec2( 0.800, 0.600 ), w3 = vec2( 0.970, - 0.243 );
						swell = w1 * cos( dot( worldPosition.xz, w1 ) * 4.2 - uT * 3.1 ) * 0.50
							+ w2 * cos( dot( worldPosition.xz, w2 ) * 7.5 - uT * 4.4 + noise.x * 2.0 ) * 0.30
							+ w3 * cos( dot( worldPosition.xz, w3 ) * 2.3 - uT * 2.2 ) * 0.45;
						swell *= ( 0.55 + 0.45 * noise.y ) * uRain * 0.6 * smoothstep( 0.0, 0.3, depth ) * ( 1.0 - smoothstep( 40.0, 170.0, length( eye - worldPosition.xyz ) ) );
					}
					vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5 * calm, 1.0, 1.5 * calm ) + vec3( 0.25 * sin( phs * 0.5 + worldPosition.x ), 0.0, cos( phs ) ) * 0.11 * ( 1.0 + 1.5 * uRain ) * shallow * smoothstep( 0.0, 0.06, depth ) - vec3( vWave.y, 0.0, vWave.z ) * 2.4 + vec3( rip.x, 0.0, rip.y ) * 2.4 );

					vec3 diffuseLight = vec3(0.0);
					vec3 specularLight = vec3(0.0);

					vec3 worldToEye = eye-worldPosition.xyz;
					vec3 eyeDirection = normalize( worldToEye );
					sunLight( surfaceNormal, eyeDirection, 260.0, 1.3, 0.5, diffuseLight, specularLight );

					float distance = length(worldToEye);

					vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;
					vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );

					float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );
					float rf0 = 0.3;
					float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );
					vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;
					vec3 albedo = mix( ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(), ( reflectionSample + sunColor * specularLight ), reflectance);
					// Orilla: lámina de agua que se va haciendo transparente hasta desaparecer sobre el barro
					float F = 0.02 + 0.98 * pow( 1.0 - theta, 5.0 );
					float Tr = exp( - max( edge, 0.0 ) * 7.0 );
					float aS = 1.0 - ( 1.0 - F ) * Tr;
					vec3 colS = ( ( reflectionSample + sunColor * specularLight ) * F + waterColor * 0.6 * ( 1.0 - F ) * ( 1.0 - Tr ) ) / max( aS, 0.02 );
					float deep = smoothstep( 0.12, 0.55, depth );
					float crest = smoothstep( 0.92, 1.0, cos( phs ) ) * shallow * 0.04 * ( 0.5 + noise.x );
					// puntilla de espuma rota en el borde de la lámina, y espuma en las crestas que rompen en lo somero
					float fn = texture2D( normalSampler, worldPosition.xz * 2.3 + vec2( uT * 0.02, 0.0 ) ).r;
					float lace = smoothstep( 0.0, 0.004, edge ) * ( 1.0 - smoothstep( 0.006, 0.022, edge ) ) * smoothstep( 0.40, 0.72, fn ) * ( 0.10 + 0.30 * uRain + 0.25 * uWave );
					float surf = smoothstep( 0.010, 0.028, vWave.x ) * ( 1.0 - smoothstep( 0.04, 0.22, depth ) ) * smoothstep( 0.45, 0.75, fn ) * 0.22;
					vec3 outgoingLight = mix( colS, albedo, deep ) + foamCol * ( crest + lace + surf + smoothstep( 0.030, 0.062, vWave.x ) * uRain * 0.08 );
					float a = mix( aS, 1.0, deep ) * smoothstep( 0.0, 0.010, edge );
					gl_FragColor = vec4( outgoingLight, alpha * clamp( a + ( lace + surf ) * 0.8, 0.0, 1.0 ) );

					#include <tonemapping_fragment>
					#include <colorspace_fragment>
					#include <fog_fragment>	
				}`

		};

		const material = new ShaderMaterial( {
			name: mirrorShader.name,
			uniforms: UniformsUtils.clone( mirrorShader.uniforms ),
			vertexShader: mirrorShader.vertexShader,
			fragmentShader: mirrorShader.fragmentShader,
			lights: true,
			side: side,
			fog: fog
		} );

		material.uniforms[ 'mirrorSampler' ].value = renderTarget.texture;
		material.uniforms[ 'textureMatrix' ].value = textureMatrix;
		material.uniforms[ 'alpha' ].value = alpha;
		material.uniforms[ 'time' ].value = time;
		material.uniforms[ 'normalSampler' ].value = normalSampler;
		material.uniforms[ 'sunColor' ].value = sunColor;
		material.uniforms[ 'waterColor' ].value = waterColor;
		material.uniforms[ 'sunDirection' ].value = sunDirection;
		material.uniforms[ 'distortionScale' ].value = distortionScale;

		material.uniforms[ 'eye' ].value = eye;

		scope.material = material;

		scope.onBeforeRender = function ( renderer, scene, camera ) {

			mirrorWorldPosition.setFromMatrixPosition( scope.matrixWorld );
			cameraWorldPosition.setFromMatrixPosition( camera.matrixWorld );

			rotationMatrix.extractRotation( scope.matrixWorld );

			normal.set( 0, 0, 1 );
			normal.applyMatrix4( rotationMatrix );

			view.subVectors( mirrorWorldPosition, cameraWorldPosition );

			// Avoid rendering when mirror is facing away

			if ( view.dot( normal ) > 0 ) return;

			view.reflect( normal ).negate();
			view.add( mirrorWorldPosition );

			rotationMatrix.extractRotation( camera.matrixWorld );

			lookAtPosition.set( 0, 0, - 1 );
			lookAtPosition.applyMatrix4( rotationMatrix );
			lookAtPosition.add( cameraWorldPosition );

			target.subVectors( mirrorWorldPosition, lookAtPosition );
			target.reflect( normal ).negate();
			target.add( mirrorWorldPosition );

			mirrorCamera.position.copy( view );
			mirrorCamera.up.set( 0, 1, 0 );
			mirrorCamera.up.applyMatrix4( rotationMatrix );
			mirrorCamera.up.reflect( normal );
			mirrorCamera.lookAt( target );

			mirrorCamera.far = camera.far; // Used in WebGLBackground

			mirrorCamera.updateMatrixWorld();
			mirrorCamera.projectionMatrix.copy( camera.projectionMatrix );

			// Update the texture matrix
			textureMatrix.set(
				0.5, 0.0, 0.0, 0.5,
				0.0, 0.5, 0.0, 0.5,
				0.0, 0.0, 0.5, 0.5,
				0.0, 0.0, 0.0, 1.0
			);
			textureMatrix.multiply( mirrorCamera.projectionMatrix );
			textureMatrix.multiply( mirrorCamera.matrixWorldInverse );

			// Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
			// Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
			mirrorPlane.setFromNormalAndCoplanarPoint( normal, mirrorWorldPosition );
			mirrorPlane.applyMatrix4( mirrorCamera.matrixWorldInverse );

			clipPlane.set( mirrorPlane.normal.x, mirrorPlane.normal.y, mirrorPlane.normal.z, mirrorPlane.constant );

			const projectionMatrix = mirrorCamera.projectionMatrix;

			q.x = ( Math.sign( clipPlane.x ) + projectionMatrix.elements[ 8 ] ) / projectionMatrix.elements[ 0 ];
			q.y = ( Math.sign( clipPlane.y ) + projectionMatrix.elements[ 9 ] ) / projectionMatrix.elements[ 5 ];
			q.z = - 1.0;
			q.w = ( 1.0 + projectionMatrix.elements[ 10 ] ) / projectionMatrix.elements[ 14 ];

			// Calculate the scaled plane vector
			clipPlane.multiplyScalar( 2.0 / clipPlane.dot( q ) );

			// Replacing the third row of the projection matrix
			projectionMatrix.elements[ 2 ] = clipPlane.x;
			projectionMatrix.elements[ 6 ] = clipPlane.y;
			projectionMatrix.elements[ 10 ] = clipPlane.z + 1.0 - clipBias;
			projectionMatrix.elements[ 14 ] = clipPlane.w;

			eye.setFromMatrixPosition( camera.matrixWorld );

			// Render

			const currentRenderTarget = renderer.getRenderTarget();

			const currentXrEnabled = renderer.xr.enabled;
			const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

			scope.visible = false;

			renderer.xr.enabled = false; // Avoid camera modification and recursion
			renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

			renderer.setRenderTarget( renderTarget );

			renderer.state.buffers.depth.setMask( true ); // make sure the depth buffer is writable so it can be properly cleared, see #18897

			if ( renderer.autoClear === false ) renderer.clear();
			renderer.render( scene, mirrorCamera );

			scope.visible = true;

			renderer.xr.enabled = currentXrEnabled;
			renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;

			renderer.setRenderTarget( currentRenderTarget );

			// Restore viewport

			const viewport = camera.viewport;

			if ( viewport !== undefined ) {

				renderer.state.viewport( viewport );

			}

		};

	}

}

export { Water };
